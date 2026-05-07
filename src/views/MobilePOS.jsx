import React, { useState } from 'react';
import { Search, ShoppingCart, Minus, Plus, Trash2, DollarSign, Store, AlertTriangle, ChevronLeft, LogOut } from 'lucide-react';
import { formatCLP, generateCode, formatRut } from '../utils/format';

const MobilePOS = ({ onLogout, products, setProducts, baskets, setBaskets, sales, setSales, offers = [], settings }) => {
  const [tab, setTab] = useState('products'); // 'products' | 'cart'
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

  const calculateTotals = () => {
    const activeOffers = (offers || []).filter(o => o.active);
    let raw = 0, final = 0, cost = 0, discount = 0;
    cart.forEach(item => {
      const sub = (item.sellPrice || 0) * item.quantity;
      raw += sub;
      cost += (item.buyPrice || 0) * item.quantity;
      const offer = activeOffers.find(o => o.targetId?.toString() === item.id?.toString() && o.targetType === item.type);
      if (offer) {
        const d = offer.discountType === 'percent'
          ? sub * (offer.discountValue / 100)
          : Math.min(offer.discountValue * item.quantity, sub);
        discount += d;
        final += sub - d;
      } else {
        final += sub;
      }
    });
    return { total: final, totalCost: cost, totalDiscount: discount };
  };

  const { total, totalCost, totalDiscount } = calculateTotals();

  const addToCart = (item) => {
    if ((item.stock || 0) <= 0) { setAlert({ msg: `Sin stock de ${item.name}`, type: 'error' }); return; }
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id && c.type === item.type);
      if (ex) {
        if (ex.quantity >= (item.stock || 0)) { setAlert({ msg: `Máximo stock: ${item.stock}`, type: 'error' }); return prev; }
        return prev.map(c => (c.id === item.id && c.type === item.type) ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setAlert({ msg: `✓ ${item.name} agregado`, type: 'success' });
    setTimeout(() => setAlert(null), 1500);
  };

  const updateQty = (id, type, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id || c.type !== type) return c;
      const src = allItems.find(a => a.id === id && a.type === type);
      const nq = c.quantity + delta;
      if (nq > (src?.stock || 0)) { setAlert({ msg: `Máximo: ${src?.stock}`, type: 'error' }); return c; }
      return nq < 1 ? c : { ...c, quantity: nq };
    }));
  };

  const removeFromCart = (id, type) => setCart(prev => prev.filter(c => !(c.id === id && c.type === type)));

  const processCheckout = () => {
    const newProducts = products.map(p => {
      const ci = cart.find(c => c.id === p.id && c.type === 'product');
      return ci ? { ...p, stock: Math.max(0, (p.stock || 0) - ci.quantity) } : p;
    });
    setProducts(newProducts);
    setBaskets(baskets.map(b => {
      const ci = cart.find(c => c.id === b.id && c.type === 'basket');
      return ci ? { ...b, stock: Math.max(0, (b.stock || 0) - ci.quantity) } : b;
    }));
    const roleRaw = localStorage.getItem('canasta_access_role');
    const role = roleRaw ? JSON.parse(roleRaw) : 'pos';
    const saleItems = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
    const newSale = {
      id: generateCode('VNT'),
      name: saleItems.length > 40 ? saleItems.substring(0, 40) + '...' : saleItems,
      seller: role === 'admin' ? 'Administrador' : 'Cajero',
      revenue: total, profit: total - totalCost,
      date: new Date().toISOString(),
      items: cart, discountApplied: totalDiscount,
      customerRut: customerRut || 'Consumidor Final',
      paymentMethod
    };
    setSales([...sales, newSale]);
    const lowStock = newProducts.filter(p => (p.stock || 0) <= (p.minStock || 5));
    if (lowStock.length > 0) setStockAlerts(lowStock);
    setCart([]); setCheckoutStep(null); setCustomerRut('');
    setTab('products');
    setAlert({ msg: '✅ ¡Venta registrada!', type: 'success' });
    setTimeout(() => setAlert(null), 2500);
  };

  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--surface)', position: 'fixed', inset: 0, zIndex: 100 }}>

      {/* Top Bar */}
      <div style={{ background: 'var(--panel)', borderBottom: '1px solid var(--surface-border)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store size={22} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{settings?.businessName || 'EspeMarket'}</span>
        </div>
        {onLogout && (
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
            <LogOut size={18} /> Salir
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {alert && (
        <div style={{ background: alert.type === 'success' ? '#059669' : '#dc2626', color: 'white', padding: '0.6rem 1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, flexShrink: 0 }}>
          {alert.msg}
        </div>
      )}

      {/* Stock Alert */}
      {stockAlerts.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.95)', color: 'white', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.85rem' }}><AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
            Stock bajo: {stockAlerts.map(p => p.name).join(', ')}
          </span>
          <button onClick={() => setStockAlerts([])} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {tab === 'products' && (
          <>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text" className="glass-input"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.2rem', width: '100%' }}
              />
            </div>

            {/* Product Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {filteredItems.map(item => {
                const hasOffer = (offers || []).some(o => o.active && o.targetId?.toString() === item.id?.toString() && o.targetType === item.type);
                const inStock = (item.stock || 0) > 0;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => addToCart(item)}
                    disabled={!inStock}
                    style={{
                      background: 'var(--panel)', border: '1px solid var(--surface-border)',
                      borderTop: `3px solid ${inStock ? (item.type === 'basket' ? 'var(--secondary)' : 'var(--primary)') : 'var(--text-muted)'}`,
                      borderRadius: '10px', padding: '0.85rem 0.75rem',
                      cursor: inStock ? 'pointer' : 'not-allowed', opacity: inStock ? 1 : 0.5,
                      textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.3rem',
                      WebkitTapHighlightColor: 'transparent', width: '100%',
                      transition: 'transform 0.1s', activeTransform: 'scale(0.97)'
                    }}
                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
                    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>{item.name}</span>
                      {hasOffer && <span style={{ background: '#10b981', color: 'white', fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>⭐ PROMO</span>}
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}>{formatCLP(item.sellPrice)}</span>
                    <span style={{ fontSize: '0.72rem', color: inStock ? 'var(--text-muted)' : 'var(--danger)' }}>
                      {inStock ? `Stock: ${item.stock}` : 'Sin stock'}
                    </span>
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay productos.</p>
              )}
            </div>
          </>
        )}

        {tab === 'cart' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <ShoppingCart size={48} opacity={0.2} style={{ margin: '0 auto 1rem' }} />
                <p>El carrito está vacío</p>
                <button onClick={() => setTab('products')} style={{ marginTop: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  ← Ir a productos
                </button>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={`${item.type}-${item.id}`} style={{ background: 'var(--panel)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>{item.name}</span>
                      <button onClick={() => removeFromCart(item.id, item.type)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatCLP(item.sellPrice)} c/u</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <button onClick={() => updateQty(item.id, item.type, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '1.1rem' }}>−</button>
                        <span style={{ fontWeight: 800, minWidth: '2rem', textAlign: 'center', fontSize: '0.95rem' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.type, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '1.1rem' }}>+</button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '0.3rem', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                      {formatCLP((item.sellPrice || 0) * item.quantity)}
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div style={{ background: 'var(--panel)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem' }}>
                  {totalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span>Descuento promo:</span><span>-{formatCLP(totalDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>TOTAL</span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCLP(total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      {!checkoutStep && (
        <div style={{ background: 'var(--panel)', borderTop: '1px solid var(--surface-border)', display: 'grid', gridTemplateColumns: cart.length > 0 ? '1fr 1fr' : '1fr', flexShrink: 0 }}>
          <button onClick={() => setTab('products')}
            style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', background: tab === 'products' ? 'var(--primary)' : 'none', border: 'none', color: tab === 'products' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
            <Store size={22} />Productos
          </button>
          {cart.length > 0 && (
            <button onClick={() => cart.length > 0 && setCheckoutStep('rut')}
              style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <DollarSign size={22} />
                {cartCount > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'white', color: '#10b981', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>{cartCount}</span>}
              </div>
              Cobrar {formatCLP(total)}
            </button>
          )}
        </div>
      )}

      {/* Checkout Modals */}
      {checkoutStep === 'rut' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: 'var(--panel)', borderRadius: '20px 20px 0 0', padding: '2rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, textAlign: 'center' }}>¿RUT del cliente?</h3>
            <input type="text" className="glass-input" value={customerRut} onChange={e => setCustomerRut(formatRut(e.target.value))}
              placeholder="Opcional — Enter para saltar" maxLength={12} style={{ textAlign: 'center', fontSize: '1.1rem', padding: '0.85rem' }} autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button onClick={() => { setCheckoutStep(null); setCustomerRut(''); }} style={{ padding: '0.85rem', background: 'var(--panel-alt)', border: '1px solid var(--surface-border)', borderRadius: '10px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => setCheckoutStep('payment')} style={{ padding: '0.85rem', background: 'var(--primary)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Siguiente →</button>
            </div>
          </div>
        </div>
      )}

      {checkoutStep === 'payment' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: 'var(--panel)', borderRadius: '20px 20px 0 0', padding: '2rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, textAlign: 'center' }}>Método de Pago</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {['Efectivo', 'Transferencia'].map(method => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  style={{ padding: '1.25rem', background: paymentMethod === method ? 'var(--primary)' : 'var(--panel-alt)', border: paymentMethod === method ? 'none' : '1px solid var(--surface-border)', borderRadius: '12px', color: paymentMethod === method ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                  {method === 'Efectivo' ? '💵' : '📲'} {method}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--panel-alt)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#10b981' }}>{formatCLP(total)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <button onClick={() => setCheckoutStep('rut')} style={{ padding: '0.85rem', background: 'var(--panel-alt)', border: '1px solid var(--surface-border)', borderRadius: '10px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>← Atrás</button>
              <button onClick={processCheckout} style={{ padding: '0.85rem', background: '#10b981', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>✅ Confirmar Venta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilePOS;
