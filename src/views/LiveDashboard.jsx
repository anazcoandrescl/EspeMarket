import React, { useMemo } from 'react';
import { Package, TrendingUp, DollarSign, Activity, Clock, Trophy } from 'lucide-react';
import { formatCLP } from '../utils/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const LiveDashboard = ({ products, baskets, sales = [] }) => {
  const totalProducts = products.length;
  const totalBaskets = baskets.length;
  
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const safeSales = Array.isArray(sales) ? sales : [];

  const salesToday = safeSales.filter(s => isSameDay(new Date(s.date), now));
  const salesMonth = safeSales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const revenueToday = salesToday.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const profitMonth = salesMonth.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
  const revenueMonth = salesMonth.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const marginMonth = revenueMonth > 0 ? (profitMonth / revenueMonth) * 100 : 0;

  const last7DaysData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      
      const daySales = safeSales.filter(s => isSameDay(new Date(s.date), d));
      data.push({
        name: d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }),
        Ingresos: daySales.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0),
        Ganancia: daySales.reduce((acc, s) => acc + (Number(s.profit) || 0), 0),
      });
    }
    return data;
  }, [safeSales]);

  const topBaskets = useMemo(() => {
    const counts = {};
    safeSales.forEach(s => {
      if (!counts[s.name]) {
        counts[s.name] = { name: s.name, quantity: 0, revenue: 0 };
      }
      counts[s.name].quantity += 1;
      counts[s.name].revenue += (Number(s.revenue) || 0);
    });
    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 4);
  }, [safeSales]);

  const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'];

  return (
    <div>
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={28} color="#10B981" /> Centro de Operaciones en Vivo
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Monitoreo de flujo de caja y ventas en tiempo real.</p>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #60a5fa' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={16} /> Ventas de Hoy
          </p>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{formatCLP(revenueToday)}</h3>
          <p style={{ fontSize: '0.85rem', color: '#60a5fa' }}>{salesToday.length} pedidos hoy</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #10B981' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} /> Ganancia Mensual
          </p>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', color: '#10B981' }}>{formatCLP(profitMonth)}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Márgen prom: <span style={{ color: '#10B981', fontWeight: 'bold' }}>{marginMonth.toFixed(1)}%</span></p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #f59e0b' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={16} /> Catálogo Activo
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem' }}>{totalBaskets}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Canastas</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem' }}>{totalProducts}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Productos</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <Activity size={18} color="var(--primary)" /> Tendencia (Últimos 7 días)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                  formatter={(value) => formatCLP(value)}
                />
                <Area type="monotone" dataKey="Ingresos" stroke="#60a5fa" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="Ganancia" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorGanancia)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <Trophy size={18} color="#fbbf24" /> Top Ventas
          </h3>
          {topBaskets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem' }}>No hay ventas registradas.</p>
          ) : (
            <>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBaskets} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={100} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'var(--panel-alt)' }}
                      contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                    />
                    <Bar dataKey="quantity" name="Vendidas" radius={[0, 4, 4, 0]} barSize={20}>
                      {topBaskets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: '1rem' }}>
                {topBaskets.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i !== topBaskets.length-1 ? '1px solid var(--surface-border)' : 'none' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{i+1}. {b.name}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{b.quantity} u.</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
          <Clock size={18} color="var(--primary)" /> Últimas Transacciones
        </h3>
        {safeSales.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Esperando primera venta...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[...safeSales].reverse().slice(0, 5).map((s, idx) => {
              const d = new Date(s.date);
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--panel-alt)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '0.5rem', borderRadius: '50%' }}>
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>Venta: {s.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{d.toLocaleDateString()} - {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 'bold', margin: 0, fontSize: '1.1rem' }}>+{formatCLP(Number(s.revenue) || 0)}</p>
                    <p style={{ fontSize: '0.8rem', color: '#10B981', margin: 0 }}>Ganancia: {formatCLP(Number(s.profit) || 0)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveDashboard;
