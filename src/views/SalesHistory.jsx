import React, { useState, useMemo } from 'react';
import { RotateCcw, Search, Calendar, DollarSign, TrendingUp, History, Download, FileSpreadsheet } from 'lucide-react';
import { formatCLP, cleanRut } from '../utils/format';

const SalesHistory = ({ sales, setSales, baskets, setBaskets, products, setProducts }) => {
  const [filter, setFilter] = useState('month');

  // Anular venta
  const cancelSale = (sale) => {
    if (!window.confirm('¿Estás seguro de anular esta venta? Se descontará del dinero ganado y los productos/canastas volverán a tu stock disponible.')) {
      return;
    }

    setSales(prev => prev.filter(s => s.id !== sale.id));
    
    // Devolver stock
    if (sale.items && sale.items.length > 0) {
      // New format from POS or updated basket sale
      setProducts(prev => prev.map(p => {
        const item = sale.items.find(i => i.id === p.id && i.type === 'product');
        if (item) return { ...p, stock: (p.stock || 0) + item.quantity };
        return p;
      }));

      setBaskets(prev => prev.map(b => {
        const item = sale.items.find(i => i.id === b.id && i.type === 'basket');
        if (item) return { ...b, stock: (b.stock || 0) + item.quantity };
        return b;
      }));
    } else if (sale.basketId) {
      // Old format fallback
      setBaskets(prev => prev.map(b => {
        if (b.id === sale.basketId) {
          return { ...b, stock: (b.stock || 0) + 1 };
        }
        return b;
      }));
    }
  };

  // Filtrado
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(sale => {
      if (filter === 'all') return true;
      
      const saleDate = new Date(sale.date);
      if (filter === 'today') {
        return saleDate.toDateString() === now.toDateString();
      }
      if (filter === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      if (filter === 'year') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Más recientes primero
  }, [sales, filter]);

  // Resumen del periodo seleccionado
  const periodRevenue = filteredSales.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const periodProfit = filteredSales.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
  const periodMargin = periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0;

  const getFilterLabel = () => {
    switch(filter) {
      case 'today': return 'Hoy';
      case 'month': return 'Este Mes';
      case 'year': return 'Este Año';
      default: return 'Todo el Histórico';
    }
  };

  const exportToExcel = () => {
    const headers = [
      'ID Transaccion',
      'Fecha',
      'Hora',
      'RUT Cliente',
      'Medio de Pago',
      'Tipo Articulo',
      'Categoria',
      'Nombre Articulo',
      'Cantidad',
      'Precio Venta Unitario',
      'Costo Unitario',
      'Subtotal Bruto',
      'Descuento Promo',
      'Ingreso Final',
      'Ganancia Neta'
    ];

    let csvContent = "\uFEFF" + headers.join(";") + "\n";

    filteredSales.forEach(sale => {
      const date = new Date(sale.date);
      const fecha = date.toLocaleDateString('es-CL');
      const hora = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item, index) => {
          const subtotalBruto = (item.sellPrice || 0) * (item.quantity || 1);
          // Colocamos el descuento total de la venta solo en la primera fila para no duplicarlo al sumar la columna en Excel
          const descuento = (index === 0 && sale.discountApplied > 0) ? sale.discountApplied : 0;
          const ingresoFinal = subtotalBruto - descuento;
          const gananciaNeta = ingresoFinal - ((item.cost || 0) * (item.quantity || 1));

          const row = [
            sale.id,
            fecha,
            hora,
            cleanRut(sale.customerRut || 'Consumidor Final'),
            sale.paymentMethod || 'Efectivo',
            item.type === 'basket' ? 'Canasta' : 'Producto',
            item.category || 'Sin Categoria',
            `"${(item.name || '').replace(/"/g, '""')}"`,
            item.quantity || 1,
            item.sellPrice || 0,
            item.cost || 0,
            subtotalBruto,
            descuento,
            ingresoFinal,
            gananciaNeta
          ];
          csvContent += row.join(";") + "\n";
        });
      } else {
        const row = [
          sale.id,
          fecha,
          hora,
          cleanRut(sale.customerRut || 'Consumidor Final'),
          sale.paymentMethod || 'Efectivo',
          sale.basketId ? 'Canasta' : 'Producto',
          'Sin Categoria',
          `"${(sale.name || 'Desconocido').replace(/"/g, '""')}"`,
          1,
          sale.revenue || 0,
          (sale.revenue || 0) - (sale.profit || 0),
          sale.revenue || 0,
          0,
          sale.revenue || 0,
          sale.profit || 0
        ];
        csvContent += row.join(";") + "\n";
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Ventas_${getFilterLabel().replace(/ /g, '_')}_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="header">
        <h1>Historial de Ventas</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--panel-alt)', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
              className={`glass-button ${filter === 'today' ? '' : 'secondary'}`} 
              onClick={() => setFilter('today')}
              style={{ padding: '0.5rem 1rem', border: 'none' }}
            >
              Hoy
            </button>
            <button 
              className={`glass-button ${filter === 'month' ? '' : 'secondary'}`} 
              onClick={() => setFilter('month')}
              style={{ padding: '0.5rem 1rem', border: 'none' }}
            >
              Mes
            </button>
            <button 
              className={`glass-button ${filter === 'year' ? '' : 'secondary'}`} 
              onClick={() => setFilter('year')}
              style={{ padding: '0.5rem 1rem', border: 'none' }}
            >
              Año
            </button>
            <button 
              className={`glass-button ${filter === 'all' ? '' : 'secondary'}`} 
              onClick={() => setFilter('all')}
              style={{ padding: '0.5rem 1rem', border: 'none' }}
            >
              Todo
            </button>
          </div>
          <button onClick={exportToExcel} className="glass-button" style={{ background: '#10B981', color: 'white', padding: '0.6rem 1rem' }}>
            <FileSpreadsheet size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #60a5fa' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={16} /> Artículos Vendidos ({getFilterLabel()})
          </p>
          <h3 style={{ fontSize: '2rem' }}>{filteredSales.length}</h3>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #34d399' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={16} /> Ingreso Bruto ({getFilterLabel()})
          </p>
          <h3 style={{ fontSize: '2rem', color: 'var(--text-main)' }}>{formatCLP(periodRevenue)}</h3>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #10B981' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} /> Ganancia Neta ({getFilterLabel()})
          </p>
          <h3 style={{ fontSize: '2rem', color: periodProfit >= 0 ? '#10B981' : 'var(--danger)' }}>
            {formatCLP(periodProfit)}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Margen: {periodMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="table-container glass-panel">
        <h2 style={{ padding: '1.5rem', margin: 0, borderBottom: '1px solid var(--surface-border)', fontSize: '1.1rem' }}>
          Detalle de Transacciones
        </h2>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Código / Fecha</th>
              <th>Cliente (RUT)</th>
              <th>Artículo Vendido</th>
              <th>Valor Venta</th>
              <th>Ganancia Neta</th>
              <th style={{ textAlign: 'center', width: '120px' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No hay ventas registradas en el periodo seleccionado.
                </td>
              </tr>
            ) : (
              filteredSales.map(sale => {
                const date = new Date(sale.date);
                return (
                  <tr key={sale.id}>
                    <td>
                      <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.2rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>#{sale.id}</div>
                      <div style={{ fontWeight: '500' }}>{date.toLocaleDateString('es-CL')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        <span style={{ padding: '0.1rem 0.3rem', background: 'var(--surface-border)', borderRadius: '4px', fontSize: '0.7rem' }}>
                          {sale.paymentMethod || 'Efectivo'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: sale.customerRut && sale.customerRut !== 'Consumidor Final' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: sale.customerRut && sale.customerRut !== 'Consumidor Final' ? 'bold' : 'normal' }}>
                        {sale.customerRut || 'Consumidor Final'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{sale.name}</div>
                      {sale.discountApplied > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.3rem', display: 'inline-flex', alignItems: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                           ⭐ Promoción Aplicada (-{formatCLP(sale.discountApplied)})
                        </div>
                      )}
                    </td>
                    <td>{formatCLP(Number(sale.revenue) || 0)}</td>
                    <td style={{ color: '#10B981', fontWeight: '500' }}>{formatCLP(Number(sale.profit) || 0)}</td>
                    <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => cancelSale(sale)}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', margin: '0 auto' }}
                          title="Anular venta y devolver stock"
                        >
                          <RotateCcw size={14} /> Anular
                        </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesHistory;
