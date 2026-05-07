import React from 'react';
import { X, Printer, MessageCircle, Download, ShoppingCart } from 'lucide-react';
import { formatCLP } from '../utils/format';

const SaleTicket = ({ sale, settings, onClose }) => {
  if (!sale) return null;

  const date = new Date(sale.date);
  const businessName = settings?.businessName || 'EspeMarket';
  const phone = settings?.phone || '';

  const ticketLines = (sale.items || []).map(item => ({
    name: item.name,
    qty: item.quantity || 1,
    price: item.sellPrice || 0,
    subtotal: (item.sellPrice || 0) * (item.quantity || 1)
  }));

  const buildPrintHTML = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Boleta ${sale.id}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 1rem 0.5rem; font-size: 12px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 0.6rem 0; }
        .row { display: flex; justify-content: space-between; margin: 0.25rem 0; font-size: 11px; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; margin: 0.4rem 0; }
        .item-name { margin-top: 0.4rem; font-weight: bold; }
        .item-detail { display: flex; justify-content: space-between; color: #555; font-size: 11px; }
        @media print { @page { margin: 0; size: 80mm auto; } body { width: 100%; } }
      </style>
    </head>
    <body>
      <div class="center" style="margin-bottom:0.75rem;">
        <div class="bold" style="font-size:16px;">${businessName}</div>
        ${phone ? `<div style="font-size:11px;">Tel: ${phone}</div>` : ''}
        <div style="font-size:11px;">Comprobante de Venta</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span>Folio:</span><span><b>${sale.id}</b></span></div>
      <div class="row"><span>Fecha:</span><span>${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>
      <div class="row"><span>Cliente:</span><span>${sale.customerRut || 'Consumidor Final'}</span></div>
      <div class="row"><span>Vendedor:</span><span>${sale.seller || 'Cajero'}</span></div>
      <div class="divider"></div>
      ${ticketLines.map(line => `
        <div class="item-name">${line.name}</div>
        <div class="item-detail">
          <span>${line.qty} x ${formatCLP(line.price)}</span>
          <span>${formatCLP(line.subtotal)}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      ${(Number(sale.discountApplied) || 0) > 0 ? `
        <div class="row"><span>Subtotal:</span><span>${formatCLP((Number(sale.revenue) || 0) + (Number(sale.discountApplied) || 0))}</span></div>
        <div class="row"><span>Descuento:</span><span>-${formatCLP(Number(sale.discountApplied))}</span></div>
        <div class="divider"></div>
      ` : ''}
      <div class="total-row"><span>TOTAL</span><span>${formatCLP(Number(sale.revenue) || 0)}</span></div>
      <div class="row"><span>Pago:</span><span>${sale.paymentMethod || 'Efectivo'}</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top:0.5rem;font-size:11px;">¡Gracias por su compra!</div>
    </body>
    </html>
  `;

  const handlePrint = () => {
    const pw = window.open('', '_blank', 'width=400,height=700');
    pw.document.write(buildPrintHTML());
    pw.document.close();
    pw.focus();
    setTimeout(() => { pw.print(); pw.close(); }, 500);
  };

  const handleWhatsApp = () => {
    const lines = ticketLines.map(l => `  ${l.qty}x ${l.name}: ${formatCLP(l.subtotal)}`).join('\n');
    const discount = (Number(sale.discountApplied) || 0) > 0 ? `\n  Descuento: -${formatCLP(sale.discountApplied)}` : '';
    const text = `🧾 *${businessName}*\n📅 ${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}\n🔖 Folio: ${sale.id}\n\n${lines}${discount}\n\n*TOTAL: ${formatCLP(Number(sale.revenue) || 0)}*\n💳 Pago: ${sale.paymentMethod || 'Efectivo'}\n\n¡Gracias por su compra!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownload = () => {
    const blob = new Blob([buildPrintHTML()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Boleta_${sale.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div style={{
        background: 'var(--panel)',
        borderRadius: '20px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        border: '1px solid var(--surface-border)'
      }}>

        {/* Green success header */}
        <div style={{
          background: 'linear-gradient(135deg, #059669, #10b981)',
          padding: '1.5rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '0.75rem', right: '0.75rem',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: '50%', color: 'white', cursor: 'pointer',
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>✅</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700 }}>¡Venta Completada!</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {formatCLP(Number(sale.revenue) || 0)} · {sale.paymentMethod || 'Efectivo'}
          </p>
        </div>

        {/* Ticket body */}
        <div style={{
          padding: '1.25rem 1.5rem',
          fontFamily: 'monospace',
          fontSize: '0.82rem',
          maxHeight: '40vh',
          overflowY: 'auto',
          background: '#fafafa',
          color: '#1a1a1a'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontWeight: 800, fontSize: '1rem' }}>{businessName}</p>
            {phone && <p style={{ color: '#666', fontSize: '0.75rem' }}>Tel: {phone}</p>}
          </div>

          <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '0.5rem 0', marginBottom: '0.6rem', fontSize: '0.78rem', color: '#555' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Folio:</span><span style={{ fontWeight: 700, color: '#111' }}>{sale.id}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fecha:</span><span>{date.toLocaleDateString('es-CL')} {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cliente:</span><span>{sale.customerRut || 'Consumidor Final'}</span></div>
          </div>

          {ticketLines.map((line, i) => (
            <div key={i} style={{ marginBottom: '0.5rem' }}>
              <p style={{ fontWeight: 700, color: '#111' }}>{line.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.78rem' }}>
                <span>{line.qty} × {formatCLP(line.price)}</span>
                <span style={{ fontWeight: 700, color: '#111' }}>{formatCLP(line.subtotal)}</span>
              </div>
            </div>
          ))}

          <div style={{ borderTop: '1px dashed #ccc', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
            {(Number(sale.discountApplied) || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontSize: '0.78rem' }}>
                <span>Descuento promo:</span><span>-{formatCLP(Number(sale.discountApplied))}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', marginTop: '0.35rem' }}>
              <span>TOTAL</span>
              <span style={{ color: '#059669' }}>{formatCLP(Number(sale.revenue) || 0)}</span>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: '#999', fontSize: '0.72rem', marginTop: '0.6rem' }}>¡Gracias por su compra!</p>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '1rem 1.25rem', background: 'var(--panel)', borderTop: '1px solid var(--surface-border)' }}>
          {/* Primary CTA */}
          <button
            onClick={onClose}
            className="glass-button"
            style={{
              width: '100%', justifyContent: 'center',
              background: 'var(--primary)', color: 'white',
              padding: '0.85rem', fontSize: '1rem', fontWeight: 700,
              marginBottom: '0.75rem', borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <ShoppingCart size={20} /> Nueva Venta
          </button>

          {/* Secondary actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            <button
              onClick={handlePrint}
              style={{
                background: 'var(--panel-alt)', border: '1px solid var(--surface-border)',
                borderRadius: '10px', cursor: 'pointer', color: 'var(--text-main)',
                padding: '0.6rem', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600
              }}
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button
              onClick={handleWhatsApp}
              style={{
                background: '#25d366', border: 'none',
                borderRadius: '10px', cursor: 'pointer', color: 'white',
                padding: '0.6rem', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600
              }}
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            <button
              onClick={handleDownload}
              style={{
                background: 'var(--panel-alt)', border: '1px solid var(--surface-border)',
                borderRadius: '10px', cursor: 'pointer', color: 'var(--text-main)',
                padding: '0.6rem', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600
              }}
            >
              <Download size={18} />
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleTicket;
