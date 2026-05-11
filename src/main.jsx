import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', background: '#222', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ Error en la aplicación</h1>
          <p>Por favor envía una captura de pantalla de este error para solucionarlo:</p>
          <pre style={{ background: '#000', padding: '1rem', overflowX: 'auto', color: '#10b981', fontSize: '0.8rem', marginTop: '1rem' }}>
            {this.state.error?.toString()}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '0.75rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Reintentar Cargar
            </button>
            <button 
              onClick={() => {
                if(confirm("¿Deseas resetear los datos locales? Esto cerrará tu sesión y podría borrar cambios no sincronizados.")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              style={{ padding: '0.75rem 1.5rem', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Resetear Datos (Cerrar Sesión)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
