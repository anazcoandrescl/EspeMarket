import React, { useRef } from 'react';
import { Settings as SettingsIcon, Save, Download, Upload, Image as ImageIcon, Store, Tags, Plus, Trash2 } from 'lucide-react';

const Settings = ({ settings, setSettings, products, setProducts, baskets, setBaskets, sales, setSales, categories, setCategories }) => {
  const fileInputRef = useRef(null);
  const restoreInputRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const createBackup = () => {
    const data = {
      products,
      baskets,
      settings,
      sales,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Respaldo_EspeMarket_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const restoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        
        if (window.confirm('¿Estás seguro de cargar este respaldo? Se sobrescribirán todos los datos actuales.')) {
          if (data.products) setProducts(data.products);
          if (data.baskets) setBaskets(data.baskets);
          if (data.settings) setSettings(data.settings);
          if (data.sales) setSales(data.sales);
          if (data.categories) setCategories(data.categories);
          alert('¡Respaldo restaurado con éxito!');
        }
      } catch (err) {
        console.error('Error parseando JSON:', err);
        alert('El archivo no es un respaldo válido.');
      }
      e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="header">
        <h1>Configuración del Negocio</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Marca y Personalización */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={24} color="var(--primary)" /> 
            Personalización de Marca
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Estos datos aparecerán en los PDFs de las cotizaciones que envíes a tus clientes.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre del Negocio</label>
            <input 
              type="text" 
              className="glass-input" 
              value={settings.businessName || ''}
              onChange={(e) => setSettings({...settings, businessName: e.target.value})}
              placeholder="Ej: Canastas Express"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Teléfono / WhatsApp</label>
            <input 
              type="text" 
              className="glass-input" 
              value={settings.phone || ''}
              onChange={(e) => setSettings({...settings, phone: e.target.value})}
              placeholder="Ej: +56 9 1234 5678"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>PIN de Acceso a Caja</label>
            <input 
              type="password" 
              className="glass-input" 
              value={settings.posPin || '1234'}
              onChange={(e) => setSettings({...settings, posPin: e.target.value})}
              placeholder="Ej: 1234"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Contraseña numérica para los vendedores.</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Logo de la Empresa</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                style={{ display: 'none' }} 
              />
              <button 
                className="glass-button secondary" 
                onClick={() => fileInputRef.current.click()}
              >
                <ImageIcon size={18} /> Seleccionar Imagen
              </button>
              {settings.logo && (
                <img src={settings.logo} alt="Logo preview" style={{ height: '40px', borderRadius: '4px', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        </div>

        {/* Respaldo de Seguridad */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={24} color="#10B981" /> 
            Respaldo y Seguridad
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Protege tu información. Descarga un archivo con todos tus productos, canastas y configuración para que nunca pierdas tu trabajo.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.5rem', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Exportar Datos</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Descarga una copia de seguridad a tu computador.</p>
              <button className="glass-button" onClick={createBackup} style={{ width: '100%', justifyContent: 'center' }}>
                <Download size={18} /> Descargar Respaldo
              </button>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1.5rem', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Restaurar Datos</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Sube un archivo de respaldo previo. ¡Cuidado, reemplazará lo actual!</p>
              <input 
                type="file" 
                accept=".json" 
                ref={restoreInputRef} 
                onChange={restoreBackup} 
                style={{ display: 'none' }} 
              />
              <button 
                className="glass-button secondary" 
                onClick={() => restoreInputRef.current.click()} 
                style={{ width: '100%', justifyContent: 'center', borderColor: '#f59e0b', color: '#f59e0b' }}
              >
                <Upload size={18} /> Cargar Respaldo
              </button>
            </div>
          </div>
        </div>

        {/* Gestión de Categorías */}
        <div className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tags size={24} color="#f472b6" /> 
            Gestión de Categorías
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Personaliza las categorías de tus productos y asígnales un color único.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {(categories || []).map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--panel-alt)', padding: '0.5rem', borderRadius: '8px' }}>
                <input 
                  type="color" 
                  value={cat.color} 
                  onChange={(e) => setCategories(categories.map(c => c.id === cat.id ? { ...c, color: e.target.value } : c))}
                  style={{ width: '30px', height: '30px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input 
                  type="text" 
                  value={cat.name}
                  onChange={(e) => setCategories(categories.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                  className="glass-input"
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.9rem' }}
                />
                <button 
                  onClick={() => {
                    if(window.confirm(`¿Eliminar la categoría ${cat.name}?`)) {
                      setCategories(categories.filter(c => c.id !== cat.id));
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          
          <button 
            className="glass-button secondary" 
            onClick={() => setCategories([...(categories || []), { id: Date.now().toString(), name: 'Nueva Categoría', color: '#888888' }])}
            style={{ width: 'max-content' }}
          >
            <Plus size={18} /> Agregar Categoría
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
