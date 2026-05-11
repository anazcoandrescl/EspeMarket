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
          <pre style={{ background: '#000', padding: '1rem', overflowX: 'auto', color: '#10b981', fontSize: '0.8rem' }}>
            {this.state.error?.toString()}
            {'\n'}
            {this.state.error?.stack}
          </pre>
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
