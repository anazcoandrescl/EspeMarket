import React, { useRef, useState } from 'react';
import { Upload, Plus, Trash2, Download, Edit2, Save, X, FileOutput, Search, AlertTriangle, TrendingUp, DollarSign, PieChart, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCLP, generateNumericCode } from '../utils/format';

const getCategoryColor = (categoryName, categories = []) => {
  const getContrast = (hex) => {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    let yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    // Higher threshold (180) means only very light colors (like bright yellow) get dark text.
    // Everything else gets white text which looks much better on badges.
    return (yiq >= 180) ? '#1f2937' : '#ffffff';
  };

  if (!categoryName) return { bg: '#3b82f6', text: '#ffffff', border: '#2563eb' };

  const customCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  if (customCat) {
    const hex = customCat.color;
    return {
      bg: hex,
      border: hex,
      text: getContrast(hex)
    };
  }

  // Fallback if not found in custom list
  const fallbackColors = [
    { bg: '#3b82f6', text: '#ffffff', border: '#3b82f6' },
    { bg: '#10b981', text: '#ffffff', border: '#10b981' },
    { bg: '#f59e0b', text: '#ffffff', border: '#f59e0b' },
    { bg: '#a855f7', text: '#ffffff', border: '#a855f7' },
  ];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  return fallbackColors[Math.abs(hash) % fallbackColors.length];
};

const Products = ({ products, setProducts, categories, setCategories }) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', cost: 0, sellPrice: 0, unit: '', category: '', stock: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [infoProduct, setInfoProduct] = useState(null);
  
  // Quick Adjust State
  const [quickAdjustProduct, setQuickAdjustProduct] = useState('');
  const [quickAdjustQty, setQuickAdjustQty] = useState('');

  const applyQuickAdjust = () => {
    if (!quickAdjustProduct || !quickAdjustQty) return;
    const qty = parseFloat(quickAdjustQty);
    if (isNaN(qty)) return;

    setProducts(products.map(p => {
      if (p.id.toString() === quickAdjustProduct.toString()) {
        return { ...p, stock: Math.max(0, (p.stock || 0) + qty) };
      }
      return p;
    }));
    
    setQuickAdjustProduct('');
    setQuickAdjustQty('');
    alert('Stock actualizado con éxito.');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Expecting data like: Nombre, Costo, Unidad (kg/un)
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newCategories = [...(categories || [])];
        let categoriesChanged = false;

        const newProducts = data.map((row) => {
          const catName = row['Categoria'] || row['Categoría'] || row['Category'] || '';
          
          if (catName && !newCategories.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
            // Auto create missing category with curated vibrant color
            const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#6366f1', '#14b8a6'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            newCategories.push({ id: Date.now().toString() + Math.random(), name: catName, color: randomColor });
            categoriesChanged = true;
          }

          return {
            id: Date.now() + Math.random(),
            sku: row['SKU'] || row['sku'] || '',
            name: row['Nombre'] || row['Producto'] || row['name'] || 'Sin nombre',
            cost: parseFloat(row['Costo'] || row['Precio'] || row['cost']) || 0,
            sellPrice: parseFloat(row['Precio Venta'] || row['PrecioVenta'] || row['Venta']) || 0,
            unit: row['Unidad'] || row['Medida'] || row['unit'] || 'un',
            category: catName,
            stock: parseFloat(row['Stock'] || row['stock'] || row['Cantidad']) || 0,
          };
        });

        if (categoriesChanged) setCategories(newCategories);

        const newAlerts = [];

        setProducts(prev => {
          const merged = [...prev];
          newProducts.forEach(np => {
            const existing = merged.findIndex(p => p.name.toLowerCase() === np.name.toLowerCase());
            if (existing >= 0) {
              if (merged[existing].cost > 0 && np.cost > merged[existing].cost * 1.05) {
                const increase = (((np.cost / merged[existing].cost) - 1) * 100).toFixed(1);
                newAlerts.push(`El costo de "${np.name}" subió un ${increase}% (de ${formatCLP(merged[existing].cost)} a ${formatCLP(np.cost)}). Considera ajustar su precio de venta.`);
              }
              merged[existing] = { ...merged[existing], sku: np.sku || merged[existing].sku || '', cost: np.cost, sellPrice: np.sellPrice, unit: np.unit, category: np.category, stock: (merged[existing].stock || 0) + (np.stock || 0) };
            } else {
              np.sku = np.sku || generateNumericCode(12);
              merged.push(np);
            }
          });
          return merged;
        });

        if (newAlerts.length > 0) setPriceAlerts(newAlerts);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('Hubo un error al leer el archivo Excel. Asegúrate de que tenga columnas como "Nombre", "Costo", "Precio Venta", "Unidad".');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { SKU: 'SKU-123456', Nombre: 'Ejemplo Producto', Categoria: 'Abarrotes', Costo: 1500, 'Precio Venta': 2500, Unidad: 'kg', Stock: 10 },
      { SKU: '', Nombre: 'Otro Producto', Categoria: 'Limpieza', Costo: 500, 'Precio Venta': 1000, Unidad: 'un', Stock: 50 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'Plantilla_EspeMarket.xlsx');
  };

  const exportProducts = () => {
    if (products.length === 0) return alert('No hay productos para exportar');
    const data = products.map(p => ({
      SKU: p.sku || '',
      Nombre: p.name,
      Categoria: p.category || '',
      Costo: p.cost,
      'Precio Venta': p.sellPrice || 0,
      Unidad: p.unit,
      Stock: p.stock || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, 'Mis_Productos_EspeMarket.xlsx');
  };

  const deleteProduct = (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const startEdit = (product) => {
    setEditForm({ ...product });
    setEditingProductId(product.id);
  };

  const saveEdit = () => {
    if (editingProductId === 'new') {
      setProducts([{
        id: Date.now(),
        name: editForm.name || 'Nuevo Producto',
        cost: parseFloat(editForm.cost) || 0,
        sellPrice: parseFloat(editForm.sellPrice) || 0,
        unit: editForm.unit || 'u',
        category: editForm.category || '',
        stock: parseFloat(editForm.stock) || 0,
        sku: editForm.sku || generateNumericCode(12)
      }, ...products]);
    } else {
      setProducts(products.map(p => p.id === editingProductId ? {
        ...p,
        name: editForm.name,
        cost: parseFloat(editForm.cost) || 0,
        sellPrice: parseFloat(editForm.sellPrice) || 0,
        unit: editForm.unit,
        category: editForm.category,
        stock: parseFloat(editForm.stock) || 0,
        sku: editForm.sku || p.sku || generateNumericCode(12)
      } : p));
    }
    setEditingProductId(null);
  };

  const createManualProduct = () => {
    setEditForm({ name: '', cost: 0, sellPrice: 0, unit: 'u', category: '', stock: 0, sku: '' });
    setEditingProductId('new');
    setSearchTerm('');
  };

  const renderInfoModal = () => {
    if (!infoProduct) return null;
    
    const cost = infoProduct.cost || 0;
    const sellPrice = infoProduct.sellPrice || 0;
    const profit = sellPrice - cost;
    const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
    const stock = infoProduct.stock || 0;
    const totalCost = cost * stock;
    const totalRevenue = sellPrice * stock;
    const totalProfit = profit * stock;

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp color="var(--primary)" /> Detalles Financieros
            </h2>
            <button onClick={() => setInfoProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          
          <div style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{infoProduct.name}</h3>
            {infoProduct.category && <span className="badge" style={{ background: 'var(--panel-alt-2)', marginBottom: '1.5rem', display: 'inline-block' }}>{infoProduct.category}</span>}
            
            <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--panel-alt)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={14}/> Por Unidad</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Costo:</span> <strong>{formatCLP(cost)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Venta:</span> <strong>{formatCLP(sellPrice)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--surface-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span>Ganancia Neta:</span> <strong style={{ color: profit >= 0 ? '#10B981' : 'var(--danger)' }}>{formatCLP(profit)}</strong>
                </div>
              </div>

              <div style={{ background: 'var(--panel-alt)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PieChart size={14}/> Rentabilidad</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <h3 style={{ fontSize: '2.5rem', margin: 0, color: margin >= 30 ? '#10B981' : (margin > 0 ? '#f59e0b' : 'var(--danger)') }}>
                    {margin.toFixed(1)}%
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Margen Comercial</p>
                </div>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Proyección de Inventario Actual ({stock} {infoProduct.unit})</h4>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Capital Invertido (Costo Total):</span>
                <span>{formatCLP(totalCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ingreso Bruto Estimado:</span>
                <span>{formatCLP(totalRevenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 'bold' }}>Ganancia Neta Esperada:</span>
                <strong style={{ fontSize: '1.2rem', color: '#10B981' }}>{formatCLP(totalProfit)}</strong>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderInfoModal()}
      <div className="header">
        <h1>Inventario de Productos</h1>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="glass-button secondary" 
            onClick={createManualProduct}
            title="Agregar producto manualmente"
            style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
          <button 
            className="glass-button secondary" 
            onClick={downloadTemplate}
            title="Descargar plantilla de ejemplo"
          >
            <Download size={18} />
            Plantilla
          </button>

          <button 
            className="glass-button secondary" 
            onClick={exportProducts}
            title="Exportar inventario actual a Excel"
          >
            <FileOutput size={18} />
            Exportar
          </button>
          
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            className="glass-button" 
            onClick={() => fileInputRef.current.click()}
            disabled={loading}
          >
            <Upload size={18} />
            {loading ? 'Cargando...' : 'Importar Excel'}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Sube un archivo Excel con las columnas <strong>Nombre</strong>, <strong>Categoria</strong>, <strong>Costo</strong>, <strong>Precio Venta</strong>, <strong>Unidad</strong> y <strong>Stock</strong>. Los productos existentes sumarán el stock y actualizarán su precio.
        </p>
        
        {priceAlerts.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} /> Alerta de Inflación
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              {priceAlerts.map((alert, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{alert}</li>)}
            </ul>
            <button onClick={() => setPriceAlerts([])} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem', textDecoration: 'underline' }}>Ocultar alertas</button>
          </div>
        )}

        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="glass-input" 
            placeholder="Buscar por nombre o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>⚡ Ajuste Rápido de Stock</label>
          <select 
            className="glass-input" 
            style={{ width: '100%', padding: '0.6rem' }}
            value={quickAdjustProduct}
            onChange={(e) => setQuickAdjustProduct(e.target.value)}
          >
            <option value="">Selecciona un producto para actualizar...</option>
            {[...products].sort((a,b) => a.name.localeCompare(b.name)).map(p => (
              <option key={p.id} value={p.id}>{p.name} (Stock actual: {p.stock || 0})</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cantidad (Ej: 50 o -5)</label>
          <input 
            type="number" 
            className="glass-input" 
            style={{ width: '100%', padding: '0.6rem' }}
            value={quickAdjustQty}
            onChange={(e) => setQuickAdjustQty(e.target.value)}
            placeholder="+50 o -10"
          />
        </div>
        <div>
          <button 
            className="glass-button" 
            onClick={applyQuickAdjust}
            disabled={!quickAdjustProduct || !quickAdjustQty}
            style={{ background: '#3b82f6', padding: '0.6rem 1.5rem' }}
          >
            Aplicar Ajuste
          </button>
        </div>
      </div>

      <div className="table-container glass-panel">
        <table className="glass-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre del Producto</th>
              <th>Categoría</th>
              <th>Costo Unit.</th>
              <th>Precio Venta</th>
              <th>Stock</th>
              <th>Unidad</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {editingProductId === 'new' && (
              <tr style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automático</span></td>
                <td><input className="glass-input" style={{ padding: '0.4rem', width: '100%' }} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nombre..." autoFocus /></td>
                <td>
                  <select className="glass-input" style={{ padding: '0.4rem', width: '100%' }} value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                    <option value="">Sin Categoría</option>
                    {(categories || []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </td>
                <td><input type="number" className="glass-input" style={{ padding: '0.4rem', width: '90px' }} value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})} /></td>
                <td><input type="number" className="glass-input" style={{ padding: '0.4rem', width: '90px' }} value={editForm.sellPrice} onChange={e => setEditForm({...editForm, sellPrice: e.target.value})} /></td>
                <td><input type="number" className="glass-input" style={{ padding: '0.4rem', width: '80px' }} value={editForm.stock} onChange={e => setEditForm({...editForm, stock: e.target.value})} /></td>
                <td><input className="glass-input" style={{ padding: '0.4rem', width: '60px' }} value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} /></td>
                <td style={{ textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button onClick={saveEdit} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', padding: '0.5rem' }} title="Guardar"><Save size={18} /></button>
                  <button onClick={() => setEditingProductId(null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem' }} title="Cancelar"><X size={18} /></button>
                </td>
              </tr>
            )}
            {products.length === 0 && editingProductId !== 'new' ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No hay productos cargados. Importa un Excel para comenzar.
                </td>
              </tr>
            ) : (
              products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())).map(product => {
                if (editingProductId === product.id) {
                  return (
                    <tr key={product.id} style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{product.sku || 'Automático'}</span></td>
                      <td><input className="glass-input" style={{ padding: '0.4rem', width: '100%' }} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                      <td>
                        <select className="glass-input" style={{ padding: '0.4rem', width: '100%' }} value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                          <option value="">Sin Categoría</option>
                          {(categories || []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </td>
                      <td><input type="number" className="glass-input" style={{ padding: '0.4rem', width: '90px' }} value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})} /></td>
                      <td><input type="number" className="glass-input" style={{ padding: '0.4rem', width: '90px' }} value={editForm.sellPrice} onChange={e => setEditForm({...editForm, sellPrice: e.target.value})} /></td>
                      <td><input type="number" className="glass-input" style={{ padding: '0.4rem', width: '80px' }} value={editForm.stock} onChange={e => setEditForm({...editForm, stock: e.target.value})} /></td>
                      <td><input className="glass-input" style={{ padding: '0.4rem', width: '60px' }} value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} /></td>
                      <td style={{ textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={saveEdit} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', padding: '0.5rem' }} title="Guardar"><Save size={18} /></button>
                        <button onClick={() => setEditingProductId(null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem' }} title="Cancelar"><X size={18} /></button>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={product.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary)' }}>{product.sku || 'N/A'}</span></td>
                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                    <td>
                      {product.category && (() => {
                        const catColor = getCategoryColor(product.category, categories);
                        return <span className="badge" style={{ background: catColor.bg, color: catColor.text, border: `1px solid ${catColor.border}` }}>{product.category}</span>;
                      })()}
                    </td>
                    <td>{formatCLP(product.cost)}</td>
                    <td>{formatCLP(product.sellPrice || 0)}</td>
                    <td style={{ color: (product.stock || 0) <= 0 ? 'var(--danger)' : 'inherit', fontWeight: 'bold' }}>{product.stock || 0}</td>
                    <td><span className="badge" style={{ background: 'var(--panel-alt-2)' }}>{product.unit}</span></td>
                    <td style={{ textAlign: 'center', display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                      <button 
                        onClick={() => setInfoProduct(product)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem' }}
                        title="Ver rentabilidad"
                      >
                        <Info size={18} />
                      </button>
                      <button 
                        onClick={() => startEdit(product)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.4rem' }}
                        title="Editar producto"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem' }}
                        title="Eliminar producto"
                      >
                        <Trash2 size={18} />
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

export default Products;
