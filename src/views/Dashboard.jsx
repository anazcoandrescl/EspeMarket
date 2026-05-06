import React, { useMemo } from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign, CreditCard, Activity, ShoppingCart } from 'lucide-react';
import { formatCLP } from '../utils/format';

const Dashboard = ({ products, baskets, sales }) => {
  // Datos del día
  const today = new Date().toLocaleDateString('es-CL');
  const salesToday = sales.filter(s => new Date(s.date).toLocaleDateString('es-CL') === today);
  
  const revenueToday = salesToday.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const profitToday = salesToday.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
  
  const cashToday = salesToday.filter(s => s.paymentMethod === 'Efectivo').reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const transferToday = salesToday.filter(s => s.paymentMethod === 'Transferencia').reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);

  // Alertas de Stock (Productos o Canastas <= 5)
  const allItems = [...(products || []), ...(baskets || [])];
  const lowStockItems = allItems.filter(item => (item.stock || 0) <= 5).sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 5);

  // Producto Estrella (Histórico)
  const topProducts = useMemo(() => {
    const counts = {};
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + (item.quantity || 1);
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 3); // Top 3
  }, [sales]);

  return (
    <div>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h1>Panel de Control Estratégico</h1>
        <p style={{ color: 'var(--text-muted)' }}>Métricas clave y estado general del negocio al día de hoy ({today}).</p>
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={20} color="var(--primary)" /> Pulso de Hoy
      </h2>
      <div className="grid-cards" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #10B981' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ingresos Hoy</p>
          <h3 style={{ fontSize: '2rem', color: 'var(--text-main)' }}>{formatCLP(revenueToday)}</h3>
          <p style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '0.25rem' }}>{salesToday.length} transacciones</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #3b82f6' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ganancia Neta Hoy</p>
          <h3 style={{ fontSize: '2rem', color: 'var(--text-main)' }}>{formatCLP(profitToday)}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Bolsillo directo</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Efectivo en Caja</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={24} color="#f59e0b" />
            <h3 style={{ fontSize: '1.5rem' }}>{formatCLP(cashToday)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Transferencias</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={24} color="#8b5cf6" />
            <h3 style={{ fontSize: '1.5rem' }}>{formatCLP(transferToday)}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Alertas de Stock */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--danger)' }}>
            <AlertTriangle size={20} /> Alertas de Inventario
          </h3>
          {lowStockItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Todo el inventario está sano. Ningún artículo bajo stock crítico (≤ 5).</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {lowStockItems.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: idx !== lowStockItems.length -1 ? '1px solid var(--surface-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }}>
                      <Package size={16} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.category || 'Canasta'}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: item.stock === 0 ? 'var(--danger)' : '#f59e0b' }}>
                      {item.stock || 0}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>en stock</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Ventas Históricas */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
            <TrendingUp size={20} /> Artículos Estrella
          </h3>
          {topProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Aún no hay suficientes datos de ventas para mostrar estrellas.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topProducts.map(([name, qty], idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: idx !== topProducts.length -1 ? '1px solid var(--surface-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: idx === 0 ? 'rgba(245, 158, 11, 0.2)' : 'var(--surface-border)', padding: '0.5rem', borderRadius: '8px', color: idx === 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                      <ShoppingCart size={16} />
                    </div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {name}
                      {idx === 0 && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#f59e0b', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Top 1</span>}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{qty}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>unidades</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
