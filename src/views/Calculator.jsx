import React, { useState } from 'react';
import { Calculator as CalcIcon, DollarSign, Percent, Package, ArrowRight } from 'lucide-react';
import { formatCLP } from '../utils/format';

const Calculator = () => {
  const [mode, setMode] = useState('findPrice'); // 'findPrice' or 'findMargin'
  
  // State for Find Price
  const [cost1, setCost1] = useState('');
  const [targetMargin, setTargetMargin] = useState('');
  
  // State for Find Margin
  const [cost2, setCost2] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  // State for Wholesale / Discounts
  const [cost3, setCost3] = useState('');
  const [normalSellPrice, setNormalSellPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  // Calculations
  // Precio Venta = Costo / (1 - (Margen / 100))
  const calculatedPrice = (parseFloat(cost1) && parseFloat(targetMargin)) 
    ? (parseFloat(cost1) / (1 - (parseFloat(targetMargin) / 100))) 
    : 0;

  // Margen = ((Precio Venta - Costo) / Precio Venta) * 100
  const calculatedMargin = (parseFloat(cost2) && parseFloat(sellPrice) && parseFloat(sellPrice) > 0)
    ? (((parseFloat(sellPrice) - parseFloat(cost2)) / parseFloat(sellPrice)) * 100)
    : 0;
  
  const calculatedProfit2 = (parseFloat(sellPrice) && parseFloat(cost2)) 
    ? parseFloat(sellPrice) - parseFloat(cost2) 
    : 0;

  // Discount Calculations
  const wQuantity = parseFloat(quantity) || 0;
  const wCostUnit = parseFloat(cost3) || 0;
  const wNormalPriceUnit = parseFloat(normalSellPrice) || 0;
  const wDiscount = parseFloat(discountPercent) || 0;

  const wTotalCost = wCostUnit * wQuantity;
  const wTotalNormalPrice = wNormalPriceUnit * wQuantity;
  const wDiscountAmount = wTotalNormalPrice * (wDiscount / 100);
  const wTotalPrice = wTotalNormalPrice - wDiscountAmount; // Price to charge
  
  const wUnitPrice = wQuantity > 0 ? (wTotalPrice / wQuantity) : 0;
  const wProfit = wTotalPrice - wTotalCost;
  const wFinalMargin = wTotalPrice > 0 ? ((wProfit / wTotalPrice) * 100) : 0;

  return (
    <div>
      <div className="header">
        <h1>Calculadora de Precios</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>
          Usa la fórmula comercial correcta para calcular tus precios. Recuerda que el margen se calcula sobre el precio de venta final, no sobre el costo.
        </p>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        
        {/* Calcular Precio Ideal */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.2)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}>
              <DollarSign size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem' }}>Calcular Precio Ideal</h2>
          </div>
          
          <div style={{ padding: '2rem', flex: 1 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Si conoces tu costo y sabes qué porcentaje de margen quieres ganar, averigua a qué precio debes vender.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Costo Total ($)</label>
              <input 
                type="number" 
                className="glass-input" 
                value={cost1}
                onChange={(e) => setCost1(e.target.value)}
                placeholder="Ej: 15000"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Margen Deseado (%)</label>
              <input 
                type="number" 
                className="glass-input" 
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
                placeholder="Ej: 30"
              />
            </div>

            <div style={{ background: 'var(--panel-alt)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, transform: 'rotate(-15deg)' }}>
                <DollarSign size={100} />
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Debes venderlo a:</p>
              <h3 style={{ fontSize: '2.5rem', color: '#10B981', marginBottom: '0.5rem' }}>{formatCLP(calculatedPrice)}</h3>
              
              {calculatedPrice > 0 && (
                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Ganancia Neta:</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCLP(calculatedPrice - parseFloat(cost1))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calcular Margen Real */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '8px', color: 'var(--secondary)' }}>
              <Percent size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem' }}>Verificar Margen Real</h2>
          </div>
          
          <div style={{ padding: '2rem', flex: 1 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Si ya tienes un costo y un precio de venta definido, averigua cuál es tu porcentaje de margen real.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Costo Total ($)</label>
              <input 
                type="number" 
                className="glass-input" 
                value={cost2}
                onChange={(e) => setCost2(e.target.value)}
                placeholder="Ej: 15000"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Precio de Venta ($)</label>
              <input 
                type="number" 
                className="glass-input" 
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="Ej: 21500"
              />
            </div>

            <div style={{ background: 'var(--panel-alt)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--secondary)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, transform: 'rotate(-15deg)' }}>
                <Percent size={100} />
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tu margen real es:</p>
              <h3 style={{ fontSize: '2.5rem', color: calculatedMargin > 0 ? '#10B981' : 'var(--danger)', marginBottom: '0.5rem' }}>
                {calculatedMargin.toFixed(1)}%
              </h3>
              
              {parseFloat(sellPrice) > 0 && (
                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Ganancia Neta:</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCLP(calculatedProfit2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simulador de Descuentos por Mayor */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.5rem', borderRadius: '8px', color: '#f59e0b' }}>
              <Package size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem' }}>Simulador de Descuentos (Ventas por Mayor)</h2>
          </div>
          
          <div style={{ padding: '2rem', flex: 1, display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ flex: '1 1 400px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Evalúa cuánto puedes descontarle a un cliente que compra por volumen, viendo inmediatamente cómo afecta tu ganancia y tu margen real.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Costo Unitario ($)</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    value={cost3}
                    onChange={(e) => setCost3(e.target.value)}
                    placeholder="Ej: 1500"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Precio Normal ($)</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    value={normalSellPrice}
                    onChange={(e) => setNormalSellPrice(e.target.value)}
                    placeholder="Ej: 3000"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cantidad</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Ej: 50"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f59e0b', fontWeight: 'bold' }}>Descuento a Aplicar (%)</label>
                <input 
                  type="number" 
                  className="glass-input" 
                  style={{ borderColor: '#f59e0b', fontSize: '1.1rem' }}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="Ej: 15"
                />
              </div>
            </div>

            <div style={{ flex: '1 1 300px', background: 'var(--panel-alt)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f59e0b', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, transform: 'rotate(-15deg)' }}>
                <Percent size={100} />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Precio Total a Cobrar (Con Dscto):</p>
                <h3 style={{ fontSize: '2.5rem', color: '#f59e0b', margin: 0 }}>{formatCLP(wTotalPrice)}</h3>
                {wDiscountAmount > 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', textDecoration: 'line-through' }}>
                    Normal: {formatCLP(wTotalNormalPrice)}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Margen Final:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: wFinalMargin > 0 ? '#10B981' : 'var(--danger)' }}>
                    {wFinalMargin.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Ganancia Neta:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: wProfit >= 0 ? '#10B981' : 'var(--danger)' }}>
                    {formatCLP(wProfit)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Precio Unitario Final:</span>
                  <span style={{ fontWeight: 'bold' }}>{formatCLP(wUnitPrice)} c/u</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Monto Descontado:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>-{formatCLP(wDiscountAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Calculator;
