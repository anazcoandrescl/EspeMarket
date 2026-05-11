import React, { useState, useEffect } from "react";
import { Package, ShoppingBasket } from "lucide-react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import Dashboard from "./views/Dashboard";
import Products from "./views/Products";
import Baskets from "./views/Baskets";
import Calculator from "./views/Calculator";
import Finances from "./views/Finances";
import Settings from "./views/Settings";
import SalesHistory from "./views/SalesHistory";
import LiveDashboard from "./views/LiveDashboard";
import POS from "./views/POS";
import Offers from "./views/Offers";
import DailyClosure from "./views/DailyClosure";
import {
  Calculator as CalcIcon,
  TrendingUp,
  Settings as SettingsIcon,
  History,
  Activity,
  LayoutDashboard,
  Sun,
  Moon,
  Monitor,
  Store,
  User,
  Lock,
  Tag,
  ClipboardList,
} from "lucide-react";
import SupabaseSync, { supabase } from "./components/SupabaseSync";

function App() {
  const [accessRole, setAccessRole] = useLocalStorage(
    "canasta_access_role",
    null,
  ); // 'admin', 'pos', or null
  const [activeTab, setActiveTab] = useLocalStorage(
    "canasta_active_tab",
    "dashboard",
  );
  const [products, setProducts] = useLocalStorage("canasta_products", []);
  const [baskets, setBaskets] = useLocalStorage("canasta_baskets", []);
  const [sales, setSales] = useLocalStorage("canasta_sales", []);
  const [offers, setOffers] = useLocalStorage("canasta_offers", []);
  const [categories, setCategories] = useLocalStorage("canasta_categories", [
    { id: "1", name: "Abarrotes", color: "#fbbf24" },
    { id: "2", name: "Lácteos", color: "#60a5fa" },
    { id: "3", name: "Huevos", color: "#f59e0b" },
  ]);
  const [settings, setSettings] = useLocalStorage("canasta_settings", {
    businessName: "EspeMarket",
    phone: "",
    logo: "",
  });
  const [theme, setTheme] = useLocalStorage("canasta_theme", "auto");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") {
      const isLight = window.matchMedia(
        "(prefers-color-scheme: light)",
      ).matches;
      root.setAttribute("data-theme", isLight ? "light" : "dark");

      const listener = (e) =>
        root.setAttribute("data-theme", e.matches ? "light" : "dark");
      window
        .matchMedia("(prefers-color-scheme: light)")
        .addEventListener("change", listener);
      return () =>
        window
          .matchMedia("(prefers-color-scheme: light)")
          .removeEventListener("change", listener);
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard products={products} baskets={baskets} sales={sales} />
        );
      case "live":
        return (
          <LiveDashboard products={products} baskets={baskets} sales={sales} />
        );
      case "pos":
        return (
          <POS
            products={products}
            setProducts={setProducts}
            baskets={baskets}
            setBaskets={setBaskets}
            sales={sales}
            setSales={setSales}
            offers={offers}
            settings={settings}
            categories={categories}
          />
        );
      case "offers":
        return (
          <Offers
            offers={offers}
            setOffers={setOffers}
            products={products}
            baskets={baskets}
          />
        );
      case "products":
        return (
          <Products
            products={products}
            setProducts={setProducts}
            categories={categories}
            setCategories={setCategories}
          />
        );
      case "baskets":
        return (
          <Baskets
            products={products}
            setProducts={setProducts}
            baskets={baskets}
            setBaskets={setBaskets}
            settings={settings}
            sales={sales}
            setSales={setSales}
          />
        );
      case "sales":
        return (
          <SalesHistory
            sales={sales}
            setSales={setSales}
            baskets={baskets}
            setBaskets={setBaskets}
            products={products}
            setProducts={setProducts}
          />
        );
      case "closure":
        return (
          <DailyClosure sales={sales} products={products} settings={settings} />
        );
      case "calculator":
        return <Calculator />;
      case "finances":
        return <Finances products={products} baskets={baskets} sales={sales} />;
      case "settings":
        return (
          <Settings
            settings={settings}
            setSettings={setSettings}
            products={products}
            setProducts={setProducts}
            baskets={baskets}
            setBaskets={setBaskets}
            sales={sales}
            setSales={setSales}
            categories={categories}
            setCategories={setCategories}
          />
        );
      default:
        return (
          <Dashboard products={products} baskets={baskets} sales={sales} />
        );
    }
  };

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showPosLogin, setShowPosLogin] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [posUser, setPosUser] = useState("");
  const [posPass, setPosPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const handlePosLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    const email = posUser.includes("@")
      ? posUser
      : `${posUser.toLowerCase()}@espemarket.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: posPass,
    });

    if (error) {
      setLoginError("Usuario o contraseña incorrectos.");
    } else {
      setAccessRole("pos");
      setActiveTab("pos");
      setShowPosLogin(false);
      setPosUser("");
      setPosPass("");
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    // Convert username to email for Supabase
    const email = adminUser.includes("@")
      ? adminUser
      : `${adminUser.toLowerCase()}@espemarket.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: adminPass,
    });

    if (error) {
      setLoginError("Usuario o contraseña incorrectos.");
    } else {
      setAccessRole("admin");
      setShowAdminLogin(false);
      setAdminUser("");
      setAdminPass("");
    }
  };

  const handleLogout = async () => {
    if (accessRole === "admin") {
      await supabase.auth.signOut();
    }
    setAccessRole(null);
  };

  if (accessRole === null) {
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "var(--bg-main)",
            color: "var(--text-main)",
            padding: "2rem",
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: "3rem",
              maxWidth: "500px",
              width: "100%",
              textAlign: "center",
              position: "relative",
            }}
          >
            {showAdminLogin ? (
              <form
                onSubmit={handleAdminLogin}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  textAlign: "left",
                }}
              >
                <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                  Acceso Administrativo
                </h2>

                {loginError && (
                  <div
                    style={{
                      padding: "1rem",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "var(--danger)",
                      borderRadius: "8px",
                      border: "1px solid var(--danger)",
                      fontSize: "0.9rem",
                      textAlign: "center",
                    }}
                  >
                    {loginError}
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Usuario
                  </label>
                  <div style={{ position: "relative" }}>
                    <User
                      size={18}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <input
                      type="text"
                      className="glass-input"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      placeholder=""
                      style={{ paddingLeft: "2.5rem", width: "100%" }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Contraseña
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={18}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <input
                      type="password"
                      className="glass-input"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      placeholder=""
                      style={{ paddingLeft: "2.5rem", width: "100%" }}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}
                >
                  <button
                    type="button"
                    className="glass-button secondary"
                    onClick={() => setShowAdminLogin(false)}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="glass-button"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      background: "var(--primary)",
                    }}
                  >
                    Ingresar
                  </button>
                </div>
              </form>
            ) : showPosLogin ? (
              <form
                onSubmit={handlePosLogin}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  textAlign: "left",
                }}
              >
                <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                  Acceso a Caja
                </h2>

                {loginError && (
                  <div
                    style={{
                      padding: "1rem",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "var(--danger)",
                      borderRadius: "8px",
                      border: "1px solid var(--danger)",
                      fontSize: "0.9rem",
                      textAlign: "center",
                    }}
                  >
                    {loginError}
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Usuario de Caja
                  </label>
                  <div style={{ position: "relative" }}>
                    <User
                      size={18}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <input
                      type="text"
                      className="glass-input"
                      value={posUser}
                      onChange={(e) => setPosUser(e.target.value)}
                      placeholder=""
                      style={{ paddingLeft: "2.5rem", width: "100%" }}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Contraseña
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={18}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <input
                      type="password"
                      className="glass-input"
                      value={posPass}
                      onChange={(e) => setPosPass(e.target.value)}
                      placeholder=""
                      style={{ paddingLeft: "2.5rem", width: "100%" }}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}
                >
                  <button
                    type="button"
                    className="glass-button secondary"
                    onClick={() => setShowPosLogin(false)}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="glass-button"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      background: "var(--primary)",
                    }}
                  >
                    Ingresar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div
                  style={{
                    background: "var(--primary)",
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem auto",
                  }}
                >
                  <Package size={32} color="white" />
                </div>
                <h1 style={{ marginBottom: "0.5rem", fontSize: "2rem" }}>
                  {settings.businessName}
                </h1>
                <p style={{ color: "var(--text-muted)", marginBottom: "3rem" }}>
                  Selecciona tu modo de acceso
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <button
                    className="glass-button"
                    onClick={() => setShowPosLogin(true)}
                    style={{
                      padding: "1.5rem",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    <Store size={24} style={{ marginRight: "0.5rem" }} />
                    Solo Punto de Venta (Caja)
                  </button>

                  <button
                    className="glass-button secondary"
                    onClick={() => setShowAdminLogin(true)}
                    style={{
                      padding: "1.5rem",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    <SettingsIcon size={24} style={{ marginRight: "0.5rem" }} />
                    Administración del Sistema
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  if (accessRole === "pos") {
    return (
      <>
        <SupabaseSync />
        <div className="app-layout" style={{ gridTemplateColumns: "1fr" }}>
          <main className="main-content" style={{ padding: 0 }}>
            <div style={{ padding: "1.5rem" }}>
              <POS
                onLogout={handleLogout}
                products={products}
                setProducts={setProducts}
                baskets={baskets}
                setBaskets={setBaskets}
                sales={sales}
                setSales={setSales}
                offers={offers}
                settings={settings}
                categories={categories}
              />
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="app-layout">
        <aside className="sidebar">
          <div>
            <h2
              style={{
                color: "var(--text-main)",
                marginBottom: "2rem",
                padding: "0 1rem",
              }}
            >
              🛒 EspeMarket
            </h2>
          </div>
          <nav
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <button
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <LayoutDashboard size={20} />
              Resumen Estático
            </button>
            <button
              className={`nav-item ${activeTab === "live" ? "active" : ""}`}
              onClick={() => setActiveTab("live")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <Activity size={20} />
              Centro en Vivo
            </button>
            <button
              className={`nav-item ${activeTab === "pos" ? "active" : ""}`}
              onClick={() => setActiveTab("pos")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                color: "var(--primary)",
              }}
            >
              <Store size={20} />
              Punto de Venta
            </button>
            <button
              className={`nav-item ${activeTab === "products" ? "active" : ""}`}
              onClick={() => setActiveTab("products")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <Package size={20} />
              Productos
            </button>
            <button
              className={`nav-item ${activeTab === "offers" ? "active" : ""}`}
              onClick={() => setActiveTab("offers")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                color: "var(--danger)",
              }}
            >
              <Tag size={20} />
              Creador de Ofertas
            </button>
            <button
              className={`nav-item ${activeTab === "baskets" ? "active" : ""}`}
              onClick={() => setActiveTab("baskets")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <ShoppingBasket size={20} />
              Canastas
            </button>
            <button
              className={`nav-item ${activeTab === "finances" ? "active" : ""}`}
              onClick={() => setActiveTab("finances")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <TrendingUp size={20} />
              Finanzas
            </button>
            <button
              className={`nav-item ${activeTab === "sales" ? "active" : ""}`}
              onClick={() => setActiveTab("sales")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <History size={20} />
              Historial de Ventas
            </button>
            <button
              className={`nav-item ${activeTab === "closure" ? "active" : ""}`}
              onClick={() => setActiveTab("closure")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <ClipboardList size={20} />
              Cierre de Caja
            </button>
            <button
              className={`nav-item ${activeTab === "calculator" ? "active" : ""}`}
              onClick={() => setActiveTab("calculator")}
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
            >
              <CalcIcon size={20} />
              Calculadora
            </button>

            <div
              style={{
                marginTop: "auto",
                paddingTop: "2rem",
                borderTop: "1px solid var(--surface-border)",
              }}
            >
              <button
                className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
                style={{
                  background: "transparent",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <SettingsIcon size={20} />
                Configuración
              </button>

              {/* Theme Switcher */}
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--surface-border)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.5rem",
                    textAlign: "center",
                  }}
                >
                  Apariencia
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.25rem",
                    background: "rgba(0,0,0,0.2)",
                    padding: "0.25rem",
                    borderRadius: "8px",
                  }}
                >
                  <button
                    onClick={() => setTheme("light")}
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "center",
                      background:
                        theme === "light" ? "var(--primary)" : "transparent",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      color: theme === "light" ? "white" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    title="Modo Diario (Claro)"
                  >
                    <Sun size={16} />
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "center",
                      background:
                        theme === "dark" ? "var(--primary)" : "transparent",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      color: theme === "dark" ? "white" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    title="Modo Nocturno (Oscuro)"
                  >
                    <Moon size={16} />
                  </button>
                  <button
                    onClick={() => setTheme("auto")}
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "center",
                      background:
                        theme === "auto" ? "var(--primary)" : "transparent",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      color: theme === "auto" ? "white" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    title="Automático (Sistema)"
                  >
                    <Monitor size={16} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="glass-button secondary"
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  justifyContent: "center",
                  borderColor: "var(--danger)",
                  color: "var(--danger)",
                }}
              >
                Cerrar Sesión
              </button>
              <SupabaseSync inline={true} />
            </div>
          </nav>
        </aside>
        <main className="main-content">{renderContent()}</main>
      </div>
    </>
  );
}

export default App;
