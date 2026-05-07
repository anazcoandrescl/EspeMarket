import React, { useMemo, useRef } from 'react';
import { Printer, TrendingUp, DollarSign, CreditCard, Package, Award, Clock, FileText } from 'lucide-react';
import { formatCLP } from '../utils/format';

const DailyClosure = ({ sales, products, settings }) => {
  const printRef = useRef(null);

  const today = new Date();
  const todayStr = today.toLocaleDateString('es-CL');

  const todaySales = useMemo(() =>
    sales.filter(s => new Date(s.date).toLocaleDateString('es-CL') === todayStr),
    [sales, todayStr]
  );

  const totalRevenue = todaySales.reduce((a, s) => a + (Number(s.revenue) || 0), 0);
  const totalProfit = todaySales.reduce((a, s) => a + (Number(s.profit) || 0), 0);
  const totalDiscount = todaySales.reduce((a, s) => a + (Number(s.discountApplied) || 0), 0);
  const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  const byPayment = useMemo(() => {
    const map = {};
    todaySales.forEach(s => {
      const method = s.paymentMethod || 'Efectivo';
      map[method] = (map[method] || 0) + (Number(s.revenue) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [todaySales]);

  const topProduct = useMemo(() => {
    const counts = {};
    todaySales.forEach(s => {
      (s.items || []).forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + (item.quantity || 1);
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [todaySales]);

  const lowStockAlerts = useMemo(() =>
    (products || []).filter(p => (p.stock || 0) <= (p.minStock || 5)).sort((a, b) => (a.stock || 0) - (b.stock || 0)),
    [products]
  );

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const businessName = settings?.businessName || 'EspeMarket';
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cierre de Caja - ${todayStr}</title>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 2rem; font-size: 14px; }
          h1 { font-size: 1.8rem; font-weight: 700; color: #1a1a1a; margin-bottom: 0.25rem; }
          .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
          .divider { border: none; border-top: 2px solid #e5e7eb; margin: 1.5rem 0; }
          .section-title { font-size: 1rem; font-weight: 700; color: #374151; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
          .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem 1.25rem; }
          .card-label { font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem; }
          .card-value { font-size: 1.5rem; font-weight: 700; color: #111; }
          .card-sub { font-size: 0.75rem; color: #6b7280; margin-top: 0.2rem; }
          .card-green { border-left: 4px solid #10b981; }
          .card-blue { border-left: 4px solid #3b82f6; }
          .card-amber { border-left: 4px solid #f59e0b; }
          .card-red { border-left: 4px solid #ef4444; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
          th { background: #f3f4f6; text-align: left; padding: 0.6rem 0.8rem; font-size: 0.8rem; color: #374151; font-weight: 600; }
          td { padding: 0.6rem 0.8rem; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; }
          .text-right { text-align: right; }
          .total-row td { font-weight: 700; font-size: 1rem; border-top: 2px solid #e5e7eb; padding-top: 0.8rem; }
          .alert-item { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: #dc2626; }
          .footer { margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 0.8rem; }
          .highlight { background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
          .highlight-label { font-size: 0.9rem; color: #065f46; font-weight: 600; }
          .highlight-value { font-size: 2rem; font-weight: 800; color: #059669; }
        </style>
      </head>
      <body>
        ${printContents}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Cierre de Caja</h1>
          <p style={{ color: 'var(--text-muted)' }}>Resumen del día: {todayStr}</p>
        </div>
        <button
          className="glass-button"
          onClick={handlePrint}
          style={{ background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Printer size={20} /> Imprimir / Guardar PDF
        </button>
      </div>

      {todaySales.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h2>No hay ventas registradas hoy</h2>
          <p>Realiza tu primera venta desde el Punto de Venta para ver el cierre aquí.</p>
        </div>
      ) : (
        <div ref={printRef}>
          {/* Print header - visible only when printing */}
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', textAlign: 'center', display: 'none' }} id="print-header">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{settings?.businessName || 'EspeMarket'}</h1>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>Cierre de Caja del {todayStr} — Generado a las {today.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {/* Summary Highlight */}
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', borderLeft: '5px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Vendido Hoy</p>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>{formatCLP(totalRevenue)}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{todaySales.length} transacción{todaySales.length !== 1 ? 'es' : ''} realizadas</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ganancia Neta</p>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6' }}>{formatCLP(totalProfit)}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Margen: {margin}%</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><DollarSign size={14} /> Descuentos Aplicados</p>
              <h3 style={{ fontSize: '1.5rem', color: '#f59e0b' }}>{formatCLP(totalDiscount)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #a855f7' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Award size={14} /> Producto Estrella</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{topProduct ? topProduct[0] : '—'}</h3>
              {topProduct && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{topProduct[1]} unidades vendidas</p>}
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #ec4899' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Package size={14} /> Alertas de Stock</p>
              <h3 style={{ fontSize: '1.5rem', color: lowStockAlerts.length > 0 ? '#ef4444' : '#10b981' }}>{lowStockAlerts.length}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lowStockAlerts.length > 0 ? 'productos bajos' : 'Sin alertas ✓'}</p>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} color="var(--primary)" /> Desglose por Método de Pago
            </h2>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Método</th>
                  <th style={{ textAlign: 'right' }}>Total Recaudado</th>
                  <th style={{ textAlign: 'right' }}>% del Total</th>
                </tr>
              </thead>
              <tbody>
                {byPayment.map(([method, amount]) => (
                  <tr key={method}>
                    <td style={{ fontWeight: 600 }}>{method}</td>
                    <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>{formatCLP(amount)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--surface-border)' }}>
                  <td style={{ fontWeight: 800 }}>TOTAL</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1rem' }}>{formatCLP(totalRevenue)}</td>
                  <td style={{ textAlign: 'right' }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sales list */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--primary)" /> Transacciones del Día ({todaySales.length})
            </h2>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Artículo</th>
                  <th>Vendedor</th>
                  <th style={{ textAlign: 'right' }}>Ingreso</th>
                  <th style={{ textAlign: 'right' }}>Ganancia</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {[...todaySales].sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(s.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.seller || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCLP(Number(s.revenue) || 0)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCLP(Number(s.profit) || 0)}</td>
                    <td><span style={{ fontSize: '0.75rem', background: 'var(--surface-border)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{s.paymentMethod || 'Efectivo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Low stock alerts */}
          {lowStockAlerts.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.3)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} /> ⚠️ Productos con Stock Bajo — Reabastecer
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {lowStockAlerts.map(p => (
                  <div key={p.id} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</p>
                    <p style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.1rem' }}>{p.stock || 0} unidades</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mínimo: {p.minStock || 5}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer for print */}
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
            {settings?.businessName || 'EspeMarket'} · Cierre del {todayStr} · Sistema EspeMarket
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyClosure;
