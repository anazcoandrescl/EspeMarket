import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Minus, Plus, Trash2, DollarSign, Store, Maximize, Keyboard, KeyboardOff, LogOut } from 'lucide-react';
import { formatCLP, generateCode, formatRut } from '../utils/format';

const POS = ({ onLogout, products, setProducts, baskets, setBaskets, sales, setSales, offers = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantityPrompt, setQuantityPrompt] = useState(null); // { item, quantity }
  const [alertPrompt, setAlertPrompt] = useState(null); // { message, type: 'error' | 'success' }
  const [checkoutStep, setCheckoutStep] = useState(null); // 'rut' | 'payment' | null
  const [customerRut, setCustomerRut] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const searchInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const rutInputRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const allItems = [
    ...(products || []).map(p => ({ ...p, type: 'product' })),
    ...(baskets || []).map(b => ({ ...b, type: 'basket', category: 'Canasta' }))
  ];

  const addToCart = (itemData, qty = 1) => {
    const existing = cart.find(item => item.id === itemData.id && item.type === itemData.type);
    if (existing) {
      if (existing.quantity + qty > (itemData.stock || 0)) {
        setAlertPrompt({ message: `No hay suficiente stock de ${itemData.name}. Máximo disponible: ${itemData.stock || 0}`, type: 'error' });
        return;
      }
      setCart(cart.map(item => (item.id === itemData.id && item.type === itemData.type) ? { ...item, quantity: item.quantity + qty } : item));
    } else {
      if ((itemData.stock || 0) < qty) {
        setAlertPrompt({ message: `No hay suficiente stock de ${itemData.name}`, type: 'error' });
        return;
      }
      setCart([...cart, { ...itemData, quantity: qty }]);
    }
    
    // Auto focus search after adding
    if (keyboardMode) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  };

  const updateQuantity = (id, type, delta) => {
    setCart(cart.map(item => {
      if (item.id === id && item.type === type) {
        const sourceItem = allItems.find(p => p.id === id && p.type === type);
        const newQ = item.quantity + delta;
        if (newQ > (sourceItem?.stock || 0)) {
          setAlertPrompt({ message: `Stock insuficiente de ${item.name}`, type: 'error' });
          return item;
        }
        return { ...item, quantity: Math.max(1, newQ) };
      }
      return item;
    }));
  };

  const removeFromCart = (id, type) => {
    setCart(cart.filter(item => !(item.id === id && item.type === type)));
  };

  const calculateTotal = () => {
    let rawTotal = 0;
    let finalTotal = 0;

    const activeOffers = offers.filter(o => o.active);
    
    cart.forEach(item => {
      let itemTotal = item.sellPrice * item.quantity;
      rawTotal += itemTotal;

      const applicableOffers = activeOffers.filter(o => o.targetId?.toString() === item.id?.toString() && o.targetType === item.type);
      
      if (applicableOffers.length > 0) {
        const offer = applicableOffers[0]; // Apply first match
        if (offer.type === 'bulk' && item.quantity >= offer.bulkMinQty) {
          itemTotal = offer.bulkNewPrice * item.quantity;
        } else if (offer.type === 'nxm') {
          const sets = Math.floor(item.quantity / offer.nxmBuy);
          const remainder = item.quantity % offer.nxmBuy;
          itemTotal = (sets * offer.nxmPay * item.sellPrice) + (remainder * item.sellPrice);
        } else if (offer.type === 'percentage') {
          itemTotal = itemTotal * (1 - (offer.discountPercent / 100));
        }
      }
      
      finalTotal += itemTotal;
    });

    return { rawTotal, finalTotal, totalDiscount: rawTotal - finalTotal };
  };

  const { rawTotal, finalTotal: total, totalDiscount } = calculateTotal();
  const totalCost = cart.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setCheckoutStep('rut');
  };

  const processCheckout = () => {
    if (cart.length === 0) return;

    // Deduct stock
    const newProducts = products.map(p => {
      const cartItem = cart.find(item => item.id === p.id && item.type === 'product');
      if (cartItem) {
        return { ...p, stock: Math.max(0, (p.stock || 0) - cartItem.quantity) };
      }
      return p;
    });
    setProducts(newProducts);

    const newBaskets = baskets.map(b => {
      const cartItem = cart.find(item => item.id === b.id && item.type === 'basket');
      if (cartItem) {
        return { ...b, stock: Math.max(0, (b.stock || 0) - cartItem.quantity) };
      }
      return b;
    });
    setBaskets(newBaskets);

    // Register sale
    const saleItems = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');
    
    // Get seller from localStorage role
    const accessRoleRaw = localStorage.getItem('canasta_access_role');
    const accessRole = accessRoleRaw ? JSON.parse(accessRoleRaw) : 'pos';
    const sellerName = accessRole === 'admin' ? 'Administrador' : 'Cajero';

    const newSale = {
      id: generateCode('VNT'),
      name: saleItems.length > 40 ? saleItems.substring(0, 40) + '...' : saleItems,
      seller: sellerName,
      revenue: total,
      profit: total - totalCost,
      date: new Date().toISOString(),
      items: cart,
      discountApplied: totalDiscount,
      customerRut: customerRut || 'Consumidor Final',
      paymentMethod: paymentMethod
    };
    
    setSales([...sales, newSale]);
    setCart([]);
    setCheckoutStep(null);
    setCustomerRut('');
    setAlertPrompt({ message: '¡Venta realizada con éxito!', type: 'success' });
  };

  const filteredItems = allItems.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Focus inputs
  useEffect(() => {
    if (checkoutStep === 'rut') {
      rutInputRef.current?.focus();
    } else if (quantityPrompt) {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    } else if (keyboardMode && !checkoutStep) {
      searchInputRef.current?.focus();
    }
  }, [quantityPrompt, keyboardMode, checkoutStep]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle Checkout Steps ALWAYS
      if (checkoutStep === 'rut') {
        if (e.key === 'Escape') {
          setCheckoutStep(null);
          setCustomerRut('');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setCheckoutStep('payment');
        }
        return; // Stop processing other keys
      }
      if (checkoutStep === 'payment') {
        if (e.key === 'Escape') {
          setCheckoutStep('rut');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          processCheckout();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          setPaymentMethod(prev => prev === 'Efectivo' ? 'Transferencia' : 'Efectivo');
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setPaymentMethod('Transferencia');
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setPaymentMethod('Efectivo');
        }
        return; // Stop processing other keys
      }

      // Handle Alert Prompt ALWAYS
      if (alertPrompt) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          setAlertPrompt(null);
          if (keyboardMode) setTimeout(() => searchInputRef.current?.focus(), 10);
        }
        return; // Stop processing other keys while alert is open
      }

      // Handle Quantity Prompt ALWAYS
      if (quantityPrompt) {
        if (e.key === 'Escape') {
          setQuantityPrompt(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          addToCart(quantityPrompt.item, Number(quantityPrompt.quantity) || 1);
          setQuantityPrompt(null);
          setSearchTerm('');
        }
        return; // Stop processing other keys while in prompt
      }

      // If not in keyboard mode, don't handle fast navigation
      if (!keyboardMode) return;

      // Prevent default on F12 or + to avoid browser dev tools if they want to use it as checkout
      if (e.key === 'F12' || e.key === '+') {
        e.preventDefault();
        handleCheckoutClick();
        return;
      }



      // Handle Tab and Arrows for Navigation
      if (e.key === 'Tab' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        return;
      }

      // If pressing Enter in search bar
      if (e.key === 'Enter') {
        e.preventDefault();
        if (searchTerm === '' && cart.length > 0) {
          // Double enter to checkout
          handleCheckoutClick();
        } else if (filteredItems.length > 0) {
          // Open quantity prompt for selected item
          const selectedItem = filteredItems[selectedIndex];
          if ((selectedItem.stock || 0) > 0) {
            setQuantityPrompt({ item: selectedItem, quantity: 1 });
          } else {
            setAlertPrompt({ message: `No hay stock de ${selectedItem.name}`, type: 'error' });
          }
        }
      }
      
      // Auto focus search if typing letters/numbers and not already focused
      if (e.key.length === 1 && document.activeElement !== searchInputRef.current && e.key !== '+' && document.activeElement !== qtyInputRef.current && document.activeElement !== rutInputRef.current && !alertPrompt) {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardMode, filteredItems, cart, products, baskets, quantityPrompt, selectedIndex, alertPrompt, checkoutStep, customerRut, paymentMethod]);

  return (
    <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 4rem)' }}>
      {/* Product List */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
        <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1><Store size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--primary)' }} />Punto de Venta</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onLogout && (
              <button 
                className="glass-button secondary" 
                onClick={onLogout}
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                title="Cerrar Caja"
              >
                <LogOut size={18} />
                <span className="hide-mobile">Cerrar Caja</span>
              </button>
            )}
            <button 
              className={`glass-button ${keyboardMode ? '' : 'secondary'}`}
              onClick={() => setKeyboardMode(!keyboardMode)}
              title="Modo Supermercado: Escribe para buscar, Enter para agregar, '+' para cobrar"
            >
              {keyboardMode ? <Keyboard size={18} /> : <KeyboardOff size={18} />}
              <span className="hide-mobile">Modo Rápido</span>
            </button>
            <button 
              className="glass-button secondary" 
              onClick={toggleFullscreen}
              title="Pantalla Completa"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>

        {keyboardMode && (
          <div style={{ background: 'var(--primary)', color: 'white', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span><strong>Teclado:</strong> Escribe para buscar</span>
            <span><strong>Tab/Flechas:</strong> Seleccionar</span>
            <span><strong>Enter:</strong> Preguntar cantidad</span>
            <span><strong>Enter x2 (Buscador vacío):</strong> Cobrar</span>
            <span><strong>+:</strong> Cobrar rápido</span>
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            ref={searchInputRef}
            type="text" 
            className="glass-input" 
            placeholder="Buscar producto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', borderColor: keyboardMode && !quantityPrompt ? 'var(--primary)' : 'var(--surface-border)' }}
            autoFocus={keyboardMode}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
          {alertPrompt && (
            <div style={{ background: alertPrompt.type === 'success' ? 'var(--panel-alt)' : 'var(--panel-alt-2)', padding: '2rem', borderRadius: '12px', border: `2px solid ${alertPrompt.type === 'success' ? '#10B981' : 'var(--danger)'}`, marginBottom: '1rem', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: alertPrompt.type === 'success' ? '#10B981' : 'var(--danger)' }}>
                {alertPrompt.message}
              </h3>
              <button 
                className="glass-button" 
                onClick={() => { setAlertPrompt(null); setTimeout(() => searchInputRef.current?.focus(), 10); }}
                style={{ margin: '0 auto' }}
              >
                Aceptar (Enter)
              </button>
            </div>
          )}

          {!alertPrompt && quantityPrompt && (
            <div style={{ background: 'var(--panel-alt-2)', padding: '2rem', borderRadius: '12px', border: '2px solid var(--primary)', marginBottom: '1rem', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>¿Cuántos "{quantityPrompt.item.name}"?</h3>
              <input 
                ref={qtyInputRef}
                type="number" 
                min="1"
                className="glass-input" 
                style={{ width: '150px', fontSize: '2rem', textAlign: 'center', borderColor: 'var(--primary)' }}
                value={quantityPrompt.quantity}
                onChange={e => setQuantityPrompt({...quantityPrompt, quantity: e.target.value})}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>Presiona Enter para confirmar o Esc para cancelar</p>
            </div>
          )}

          <div style={{ padding: '0.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', opacity: (quantityPrompt || alertPrompt) ? 0.3 : 1, pointerEvents: (quantityPrompt || alertPrompt) ? 'none' : 'auto' }}>
            {filteredItems.map((item, index) => {
              const isSelected = keyboardMode && index === selectedIndex && !quantityPrompt && !alertPrompt;
              
              return (
                <div 
                  key={`${item.type}-${item.id}`} 
                  className="glass-panel" 
                  style={{ 
                    padding: '1rem', 
                    cursor: (item.stock || 0) > 0 ? 'pointer' : 'not-allowed',
                    opacity: (item.stock || 0) > 0 ? 1 : 0.4,
                    transition: 'all 0.15s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: `4px solid ${isSelected ? 'rgba(255,255,255,0.3)' : ((item.stock || 0) > 0 ? (item.type === 'basket' ? 'var(--secondary)' : 'var(--primary)') : 'var(--text-muted)')}`,
                    boxShadow: isSelected ? '0 12px 30px rgba(59, 130, 246, 0.4)' : 'none',
                    backgroundColor: isSelected ? 'var(--primary)' : '',
                    color: isSelected ? '#ffffff' : '',
                    transform: isSelected ? 'translateY(-4px) scale(1.02)' : 'none',
                    zIndex: isSelected ? 10 : 1
                  }}
                  onClick={() => {
                    if ((item.stock || 0) > 0) {
                      setQuantityPrompt({ item, quantity: 1 });
                    }
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={e => e.currentTarget.style.transform = isSelected ? 'translateY(-4px) scale(1.02)' : 'none'}
                  onMouseLeave={e => e.currentTarget.style.transform = isSelected ? 'translateY(-4px) scale(1.02)' : 'none'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{item.name}</h4>
                    <div style={{ display: 'flex', gap: '0.25rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {item.type === 'basket' && <span className="badge" style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--panel-alt)', color: isSelected ? '#ffffff' : '', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Canasta</span>}
                      {offers.some(o => o.active && o.targetId?.toString() === item.id?.toString() && o.targetType === item.type) && (
                        <span className="badge" style={{ background: isSelected ? '#ffffff' : '#10B981', color: isSelected ? '#10B981' : '#ffffff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', fontWeight: 'bold' }}>⭐ Promo</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontWeight: 'bold', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>{formatCLP(item.sellPrice)}</span>
                    <span style={{ fontSize: '0.8rem', color: isSelected ? 'rgba(255,255,255,0.9)' : ((item.stock || 0) > 0 ? 'var(--secondary)' : 'var(--danger)'), fontWeight: 'bold' }}>
                      Stock: {item.stock || 0}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', marginTop: '2rem' }}>No se encontraron artículos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="glass-panel" style={{ flex: 1, minWidth: '300px', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShoppingCart size={24} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Carrito de Venta</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
              <ShoppingCart size={48} opacity={0.2} />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cart.map(item => (
                <div key={`${item.type}-${item.id}`} style={{ background: 'var(--panel-alt)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name} {item.type === 'basket' && <span style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>(Canasta)</span>}</span>
                    <button onClick={() => removeFromCart(item.id, item.type)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatCLP(item.sellPrice)} c/u</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--surface-border)' }}>
                      <button onClick={() => updateQuantity(item.id, item.type, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', padding: '0.2rem 0.5rem', cursor: 'pointer' }}><Minus size={14}/></button>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.type, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', padding: '0.2rem 0.5rem', cursor: 'pointer' }}><Plus size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', background: 'var(--panel-alt-2)' }}>
          {totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#10B981' }}>
              <span>Descuento Promocional:</span>
              <span>-{formatCLP(totalDiscount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total a Pagar</span>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCLP(total)}</span>
          </div>
          <button 
            className="glass-button" 
            style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            disabled={cart.length === 0}
            onClick={handleCheckoutClick}
          >
            <DollarSign size={20} />
            Cobrar Ahora {keyboardMode && '(+)'}
          </button>
        </div>
      </div>

      {checkoutStep === 'rut' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--text-main)' }}>Paso 1: Identificación</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Ingresa el RUT del cliente para el comprobante</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>RUT (Opcional)</label>
              <input 
                ref={rutInputRef}
                type="text" 
                className="glass-input" 
                value={customerRut} 
                onChange={(e) => setCustomerRut(formatRut(e.target.value))} 
                placeholder="Ej: 12.345.678-9 (Enter para saltar)"
                maxLength={12}
                style={{ fontSize: '1.1rem', textAlign: 'center', padding: '1rem', fontFamily: 'monospace' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="glass-button secondary" style={{ flex: 1 }} onClick={() => { setCheckoutStep(null); setCustomerRut(''); }}>
                Cancelar (Esc)
              </button>
              <button className="glass-button" style={{ flex: 1, background: 'var(--primary)', color: 'white' }} onClick={() => setCheckoutStep('payment')}>
                Siguiente (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutStep === 'payment' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--text-main)' }}>Paso 2: Pago</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Selecciona el método de pago</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className={`glass-button ${paymentMethod === 'Efectivo' ? '' : 'secondary'}`} 
                  style={{ flex: 1, padding: '1.5rem 0.5rem', background: paymentMethod === 'Efectivo' ? 'var(--primary)' : 'var(--surface)', fontSize: '1.1rem' }}
                  onClick={() => setPaymentMethod('Efectivo')}
                >
                  Efectivo
                </button>
                <button 
                  className={`glass-button ${paymentMethod === 'Transferencia' ? '' : 'secondary'}`} 
                  style={{ flex: 1, padding: '1.5rem 0.5rem', background: paymentMethod === 'Transferencia' ? 'var(--primary)' : 'var(--surface)', fontSize: '1.1rem' }}
                  onClick={() => setPaymentMethod('Transferencia')}
                >
                  Transferencia
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Usa las flechas ← → o Tab para cambiar rápidamente</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="glass-button secondary" style={{ flex: 1 }} onClick={() => setCheckoutStep('rut')}>
                Atrás (Esc)
              </button>
              <button className="glass-button" style={{ flex: 1, background: '#10B981', color: 'white' }} onClick={processCheckout}>
                Finalizar (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
