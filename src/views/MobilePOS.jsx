import React, { useState } from 'react';
import { Search, ShoppingCart, Trash2, DollarSign, Store, AlertTriangle, LogOut } from 'lucide-react';
import { formatCLP, generateCode, formatRut } from '../utils/format';

const MobilePOS = ({ onLogout, products, setProducts, baskets, setBaskets, sales, setSales, offers = [], settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [customerRut, setCustomerRut] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [alert, setAlert] = useState(null);
  const [stockAlerts, setStockAlerts] = useState([]);

  const allItems = [
    ...(products || []).map(p => ({ ...p, type: 'product' })),
    ...(baskets || []).map(b => ({ ...b, type: 'basket', category: 'Canasta' }))
  ];

  const filteredItems = allItems.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // All values forced to numbers to prevent NaN
  const calculateTotals = () => {
    const activeOffers = (offers || []).filter(o => o.active);
    let finalTotal = 0, totalCost = 0, totalDiscount = 0;
    cart.forEach(item => {
      const price = Number(item.sellPrice) || 0;
      const qty = Number(item.quantity) || 1;
      const buy = Number(item.buyPrice) || 0;
      const sub = price * qty;
      totalCost += buy * qty;
      const offer = activeOffers.find(o =>
        o.targetId?.toString() === item.id?.toString() && o.targetType === item.type
      );
      if (offer) {
        const discVal = Number(offer.discountValue) || 0;
        const d = offer.discountType === 'percent'
          ? sub * (discVal / 100)
          : Math.min(discVal * qty, sub);
        totalDiscount += d;
        finalTotal += sub - d;
      } else {
        finalTotal += sub;
      }
    });
    return { total: finalTotal, totalCost, totalDiscount };
  };

  const { total, totalCost, totalDiscount } = calculateTotals();

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 1800);
  };

  const addToCart = (item) => {
    const stock = Number(item.stock) || 0;
    if (stock <= 0) { showAlert(`Sin stock de ${item.name}`, 'error'); return; }
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id && c.type === item.type);
      if (ex) {
        if (ex.quantity >= stock) { showAlert(`Máximo stock: ${stock}`, 'error'); return prev; }
        return prev.map(c => (c.id === item.id && c.type === item.type) ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1, sellPrice: Number(item.sellPrice) || 0, buyPrice: Number(item.buyPrice) || 0 }];
    });
    showAlert(`✓ ${item.name}`, 'success');
  };

  const updateQty = (id, type, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id || c.type !== type) return c;
      const src = allItems.find(a => a.id === id && a.type === type);
      const maxStock = Number(src?.stock) || 0;
      const nq = c.quantity + delta;
      if (nq > maxStock) { showAlert(`Máximo: ${maxStock}`, 'error'); return c; }
      return nq < 1 ? c : { ...c, quantity: nq };
    }));
  };

  const removeFromCart = (id, type) => setCart(prev => prev.filter(c => !(c.id === id && c.type === type)));

  const processCheckout = () => {
    const newProducts = products.map(p => {
      const ci = cart.find(c => c.id === p.id && c.type === 'product');
      return ci ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) - ci.quantity) } : p;
    });
    setProducts(newProducts);
    setBaskets(baskets.map(b => {
      const ci = cart.find(c => c.id === b.id && c.type === 'basket');
      return ci ? { ...b, stock: Math.max(0, (Number(b.stock) || 0) - ci.quantity) } : b;
    }));
    const roleRaw = localStorage.getItem('canasta_access_role');
    const role = roleRaw ? JSON.parse(roleRaw) : 'pos';
    const saleItems = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
    setSales([...sales, {
      id: generateCode('VNT'),
      name: saleItems.length > 40 ? saleItems.substring(0, 40) + '...' : saleItems,
      seller: role === 'admin' ? 'Administrador' : 'Cajero',
      revenue: total, profit: total - totalCost,
      date: new Date().toISOString(),
      items: cart, discountApplied: totalDiscount,
      customerRut: customerRut || 'Consumidor Final',
      paymentMethod
    }]);
    const lowStock = newProducts.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 5));
    if (lowStock.length > 0) setStockAlerts(lowStock);
    setCart([]); setCheckoutStep(null); setCustomerRut('');
    showAlert('✅ ¡Venta registrada!', 'success');
  };

  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--surface)', position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden' }}>

      {/* Top Bar */}
      <div style={{ background: 'var(--panel)', borderBottom: '1px solid var(--surface-border)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store size={20} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{settings?.businessName || 'EspeMarket'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {cartCount > 0 && (
            <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '12px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 700 }}>
              {cartCount} ítem{cartCount > 1 ? 's' : ''}
            </span>
          )}
          {onLogout && (
            <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div style={{
          background: alert.type === 'success' ? '#059669' : '#dc2626',
          color: 'white', padding: '0.5rem 1rem', textAlign: 'center',
          fontSize: '0.9rem', fontWeight: 600, flexShrink: 0,
          transition: 'all 0.2s'
        }}>
          {alert.msg}
        </div>
      )}

      {/* Stock Alert */}
      {stockAlerts.length > 0 && (
        <div style={{ background: '#dc2626', color: 'white', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, fontSize: '0.85rem' }}>
          <span><AlertTriangle size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Stock bajo: {stockAlerts.map(p => p.name).join(', ')}
          </span>
          <button onClick={() => setStockAlerts([])} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '0.75rem', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" className="glass-input"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.2rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Product Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {filteredItems.map(item => {
            const hasOffer = (offers || []).some(o => o.active && o.targetId?.toString() === item.id?.toString() && o.targetType === item.type);
            const inStock = (Number(item.stock) || 0) > 0;
            const inCart = cart.find(c => c.id === item.id && c.type === item.type);
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => addToCart(item)}
                disabled={!inStock}
                style={{
                  background: inCart ? 'rgba(99,102,241,0.12)' : 'var(--panel)',
                  border: `2px solid ${inCart ? 'var(--primary)' : 'var(--surface-border)'}`,
                  borderTop: `3px solid ${inStock ? (item.type === 'basket' ? 'var(--secondary)' : 'var(--primary)') : 'var(--text-muted)'}`,
                  borderRadius: '10px', padding: '0.85rem 0.75rem',
                  cursor: inStock ? 'pointer' : 'not-allowed', opacity: inStock ? 1 : 0.45,
                  textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.3rem',
                  WebkitTapHighlightColor: 'transparent', width: '100%',
                  position: 'relative'
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {inCart && (
                  <span style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                    {inCart.quantity}
                  </span>
                )}
                <span style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2, paddingRight: inCart ? '1.5rem' : 0 }}>{item.name}</span>
                {hasOffer && <span style={{ background: '#10b981', color: 'white', fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700, alignSelf: 'flex-start' }}>⭐ PROMO</span>}
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.95rem', marginTop: 'auto' }}>{formatCLP(Number(item.sellPrice) || 0)}</span>
                <span style={{ fontSize: '0.7rem', color: inStock ? 'var(--text-muted)' : '#dc2626' }}>
                  {inStock ? `Stock: ${item.stock}` : 'Sin stock'}
                </span>
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay productos.</p>
          )}
        </div>
      </div>

      {/* Bottom Checkout Bar */}
      {!checkoutStep && cartCount > 0 && (
        <div style={{ background: 'var(--panel)', borderTop: '1px solid var(--surface-border)', padding: '0.75rem', flexShrink: 0 }}>
          {/* Cart mini-summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, overflowX: 'auto' }}>
              {cart.map(item => (
                <div key={`${item.type}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--panel-alt)', borderRadius: '6px', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600 }}>{item.quantity}× {item.name}</span>
                  <button onClick={() => removeFromCart(item.id, item.type)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#10b981', marginBottom: '0.3rem' }}>
              <span>Descuento promo</span><span>-{formatCLP(totalDiscount)}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setCart([])} style={{ background: 'none', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '0.7rem 0.75rem', cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}>
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setCheckoutStep('rut')}
              style={{ flex: 1, background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              <DollarSign size={20} />
              Cobrar {formatCLP(total)}
            </button>
          </div>
        </div>
      )}

      {/* RUT Modal */}
      {checkoutStep === 'rut' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: 'var(--panel)', borderRadius: '24px 24px 0 0', padding: '2rem 1.5rem 2.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--surface-border)', borderRadius: '2px', margin: '0 auto -0.5rem' }} />
            <h3 style={{ margin: 0, textAlign: 'center', fontSize: '1.15rem' }}>¿RUT del cliente?</h3>
            <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.5rem' }}>Opcional · puedes dejarlo vacío</p>
            <input type="text" className="glass-input" value={customerRut}
              onChange={e => setCustomerRut(formatRut(e.target.value))}
              placeholder="12.345.678-9" maxLength={12}
              style={{ textAlign: 'center', fontSize: '1.2rem', padding: '1rem', letterSpacing: '0.05em' }} autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <button onClick={() => { setCheckoutStep(null); setCustomerRut(''); }}
                style={{ padding: '0.9rem', background: 'var(--panel-alt)', border: '1px solid var(--surface-border)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={() => setCheckoutStep('payment')}
                style={{ padding: '0.9rem', background: 'var(--primary)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {checkoutStep === 'payment' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: 'var(--panel)', borderRadius: '24px 24px 0 0', padding: '2rem 1.5rem 2.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--surface-border)', borderRadius: '2px', margin: '0 auto -0.5rem' }} />
            <h3 style={{ margin: 0, textAlign: 'center', fontSize: '1.15rem' }}>¿Cómo paga?</h3>

            {/* Payment options - large, clear */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { id: 'Efectivo', emoji: '💵', label: 'Efectivo', color: '#16a34a' },
                { id: 'Transferencia', emoji: '📲', label: 'Transferencia', color: '#2563eb' }
              ].map(m => {
                const selected = paymentMethod === m.id;
                return (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    style={{
                      padding: '1.4rem 1rem', borderRadius: '14px', cursor: 'pointer',
                      background: selected ? m.color : 'var(--panel-alt)',
                      border: selected ? `2px solid ${m.color}` : '2px solid var(--surface-border)',
                      color: selected ? 'white' : 'var(--text-muted)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                      transition: 'all 0.15s',
                      boxShadow: selected ? `0 4px 16px ${m.color}55` : 'none'
                    }}>
                    <span style={{ fontSize: '2rem' }}>{m.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.label}</span>
                    {selected && <span style={{ fontSize: '0.7rem', opacity: 0.9, background: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>✓ Seleccionado</span>}
                  </button>
                );
              })}
            </div>

            {/* Total highlight */}
            <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Total a cobrar</span>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '1.5rem' }}>{formatCLP(total)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <button onClick={() => setCheckoutStep('rut')}
                style={{ padding: '0.9rem', background: 'var(--panel-alt)', border: '1px solid var(--surface-border)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                ← Atrás
              </button>
              <button onClick={processCheckout}
                style={{ padding: '0.9rem', background: '#059669', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                ✅ Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilePOS;
