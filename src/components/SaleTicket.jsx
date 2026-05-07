import React from 'react';
import { X, Printer, MessageCircle, Download } from 'lucide-react';
import { formatCLP } from '../utils/format';

/**
 * SaleTicket – modal that shows a formatted receipt after a sale,
 * with options to print, share via WhatsApp, or close.
 */
const SaleTicket = ({ sale, settings, onClose }) => {
  if (!sale) return null;

  const date = new Date(sale.date);
  const businessName = settings?.businessName || 'EspeMarket';
  const phone = settings?.phone || '';

  const ticketLines = () => {
    const lines = (sale.items || []).map(item => ({
      name: item.name,
      qty: item.quantity || 1,
      price: item.sellPrice || 0,
      subtotal: (item.sellPrice || 0) * (item.quantity || 1)
    }));
    return lines;
  };

  const buildPrintHTML = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Boleta ${sale.id}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 0.5rem; font-size: 12px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 0.5rem 0; }
        .row { display: flex; justify-content: space-between; margin: 0.2rem 0; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 0.3rem 0; }
        .header { margin-bottom: 0.75rem; }
        .footer { margin-top: 0.75rem; font-size: 10px; }
        @media print { @page { margin: 0; } body { width: 100%; } }
      </style>
    </head>
    <body>
      <div class="header center">
        <div class="bold" style="font-size:16px;">${businessName}</div>
        ${phone ? `<div>Tel: ${phone}</div>` : ''}
        <div>Boleta Electrónica</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span>Folio:</span><span>${sale.id}</span></div>
      <div class="row"><span>Fecha:</span><span>${date.toLocaleDateString('es-CL')}</span></div>
      <div class="row"><span>Hora:</span><span>${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>
      <div class="row"><span>Cliente:</span><span>${sale.customerRut || 'Consumidor Final'}</span></div>
      <div class="row"><span>Vendedor:</span><span>${sale.seller || 'Cajero'}</span></div>
      <div class="divider"></div>
      <div class="bold" style="margin-bottom:0.3rem;">DETALLE</div>
      ${ticketLines().map(line => `
        <div>${line.name}</div>
        <div class="row">
          <span>  ${line.qty} x ${formatCLP(line.price)}</span>
          <span>${formatCLP(line.subtotal)}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      ${(Number(sale.discountApplied) || 0) > 0 ? `
        <div class="row"><span>Subtotal:</span><span>${formatCLP(Number(sale.revenue) + Number(sale.discountApplied))}</span></div>
        <div class="row"><span>Descuento Promo:</span><span>-${formatCLP(Number(sale.discountApplied))}</span></div>
        <div class="divider"></div>
      ` : ''}
      <div class="total-row"><span>TOTAL:</span><span>${formatCLP(Number(sale.revenue) || 0)}</span></div>
      <div class="row"><span>Forma de Pago:</span><span>${sale.paymentMethod || 'Efectivo'}</span></div>
      <div class="divider"></div>
      <div class="footer center">
        <div>¡Gracias por su compra!</div>
        <div>Documento no válido como boleta tributaria</div>
      </div>
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
    const lines = ticketLines().map(l => `${l.qty}x ${l.name}: ${formatCLP(l.subtotal)}`).join('\n');
    const discount = (Number(sale.discountApplied) || 0) > 0 ? `\nDescuento: -${formatCLP(sale.discountApplied)}` : '';
    const text = `*${businessName} — Boleta*\n📅 ${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}\n🔖 Folio: ${sale.id}\n\n${lines}${discount}\n\n*TOTAL: ${formatCLP(Number(sale.revenue) || 0)}*\nPago: ${sale.paymentMethod || 'Efectivo'}\n\n¡Gracias por su compra!`;
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'var(--panel)', borderRadius: '16px', width: '100%', maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--panel-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Boleta / Comprobante</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Folio: {sale.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Ticket Body */}
        <div style={{ padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: '55vh', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{businessName}</p>
            {phone && <p style={{ color: 'var(--text-muted)' }}>Tel: {phone}</p>}
          </div>

          <div style={{ borderTop: '1px dashed var(--surface-border)', borderBottom: '1px dashed var(--surface-border)', padding: '0.75rem 0', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Fecha:</span><span>{date.toLocaleDateString('es-CL')} {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Cliente:</span><span>{sale.customerRut || 'Consumidor Final'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Vendedor:</span><span>{sale.seller || 'Cajero'}</span></div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            {ticketLines().map((line, i) => (
              <div key={i} style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: 600 }}>{line.name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <span>{line.qty} × {formatCLP(line.price)}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCLP(line.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed var(--surface-border)', paddingTop: '0.75rem' }}>
            {(Number(sale.discountApplied) || 0) > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Subtotal:</span><span>{formatCLP((Number(sale.revenue) || 0) + (Number(sale.discountApplied) || 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Descuento Promo:</span><span>-{formatCLP(Number(sale.discountApplied))}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--surface-border)' }}>
              <span>TOTAL</span>
              <span style={{ color: '#10b981' }}>{formatCLP(Number(sale.revenue) || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span>Pago:</span><span>{sale.paymentMethod || 'Efectivo'}</span>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem' }}>¡Gracias por su compra!</p>
        </div>

        {/* Actions */}
        <div style={{ padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', borderTop: '1px solid var(--surface-border)' }}>
          <button onClick={handlePrint} className="glass-button" style={{ justifyContent: 'center', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', fontSize: '0.8rem' }}>
            <Printer size={18} />
            Imprimir
          </button>
          <button onClick={handleWhatsApp} className="glass-button" style={{ justifyContent: 'center', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', background: '#25d366', color: 'white' }}>
            <MessageCircle size={18} />
            WhatsApp
          </button>
          <button onClick={handleDownload} className="glass-button secondary" style={{ justifyContent: 'center', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', fontSize: '0.8rem' }}>
            <Download size={18} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleTicket;
