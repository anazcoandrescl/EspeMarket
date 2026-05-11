import React, { useState } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  DollarSign,
  Store,
  AlertTriangle,
  LogOut,
  Check,
  History,
  X,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../components/SupabaseSync";
import { formatCLP, generateCode, formatRut } from "../utils/format";

const MobilePOS = ({
  onLogout,
  products,
  setProducts,
  baskets,
  setBaskets,
  sales,
  setSales,
  offers = [],
  settings,
  categories = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [customerRut, setCustomerRut] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [alert, setAlert] = useState(null);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const allItems = [
    ...(products || []).filter(p => p).map((p) => ({ ...p, type: "product", name: p.name || "Sin nombre" })),
    ...(baskets || []).filter(b => b).map((b) => ({
      ...b,
      type: "basket",
      category: "Canasta",
      name: b.name || "Canasta sin nombre"
    })),
  ];

  const filteredItems = allItems.filter((p) => {
    const pName = (p.name || "").toLowerCase();
    const pCat = (p.category || "").toLowerCase();
    const sTerm = (searchTerm || "").toLowerCase();

    const matchesSearch =
      pName.includes(sTerm) ||
      pCat.includes(sTerm);
    const matchesCategory =
      selectedCategory === "all" ||
      p.category === selectedCategory ||
      (selectedCategory === "Canasta" && p.type === "basket");
    return matchesSearch && matchesCategory;
  });

  // Exact same logic as desktop POS
  const calculateTotal = () => {
    let rawTotal = 0;
    let finalTotal = 0;
    const activeOffers = (offers || []).filter((o) => o.active);
    cart.forEach((item) => {
      let itemTotal =
        (Number(item.sellPrice) || 0) * (Number(item.quantity) || 1);
      rawTotal += itemTotal;
      const applicableOffers = activeOffers.filter(
        (o) =>
          o.targetId?.toString() === item.id?.toString() &&
          o.targetType === item.type,
      );
      if (applicableOffers.length > 0) {
        const offer = applicableOffers[0];
        if (offer.type === "bulk" && item.quantity >= offer.bulkMinQty) {
          itemTotal = (Number(offer.bulkNewPrice) || 0) * item.quantity;
        } else if (offer.type === "nxm") {
          const sets = Math.floor(item.quantity / offer.nxmBuy);
          const remainder = item.quantity % offer.nxmBuy;
          itemTotal =
            sets * offer.nxmPay * (Number(item.sellPrice) || 0) +
            remainder * (Number(item.sellPrice) || 0);
        } else if (offer.type === "percentage") {
          itemTotal =
            itemTotal * (1 - (Number(offer.discountPercent) || 0) / 100);
        }
      }
      finalTotal += itemTotal;
    });
    return { rawTotal, finalTotal, totalDiscount: rawTotal - finalTotal };
  };

  const { rawTotal, finalTotal: total, totalDiscount } = calculateTotal();
  const totalCost = cart.reduce(
    (acc, item) =>
      acc + (Number(item.cost) || Number(item.buyPrice) || 0) * item.quantity,
    0,
  );

  const showAlert = (msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 1800);
  };

  const addToCart = (item) => {
    const stock = Number(item.stock) || 0;
    if (stock <= 0) {
      showAlert(`Sin stock de ${item.name}`, "error");
      return;
    }
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id && c.type === item.type);
      if (ex) {
        if (ex.quantity >= stock) {
          showAlert(`Máximo: ${stock}`, "error");
          return prev;
        }
        return prev.map((c) =>
          c.id === item.id && c.type === item.type
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
          sellPrice: Number(item.sellPrice) || 0,
          buyPrice: Number(item.buyPrice) || 0,
        },
      ];
    });
    showAlert(`✓ ${item.name} agregado`, "success");
  };

  const updateQty = (id, type, delta) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.type !== type) return c;
        const src = allItems.find((a) => a.id === id && a.type === type);
        const maxStock = Number(src?.stock) || 0;
        const nq = c.quantity + delta;
        if (nq > maxStock) {
          showAlert(`Máximo: ${maxStock}`, "error");
          return c;
        }
        return nq < 1 ? c : { ...c, quantity: nq };
      }),
    );
  };

  const removeFromCart = (id, type) =>
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));

  const processCheckout = async () => {
    try {
      // Sincronización forzada antes de cobrar para evitar pisar stock de otras cajas
      const { data } = await supabase
        .from("app_data")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) {
        if (data.products)
          localStorage.setItem(
            "canasta_products",
            JSON.stringify(data.products),
          );
        if (data.baskets)
          localStorage.setItem("canasta_baskets", JSON.stringify(data.baskets));
        if (data.sales)
          localStorage.setItem("canasta_sales", JSON.stringify(data.sales));
      }
    } catch (e) {
      console.warn("No se pudo obtener el último estado antes del checkout", e);
    }

    setProducts((prevProducts) => {
      const updatedProducts = prevProducts.map((p) => {
        const ci = cart.find(
          (c) => c.id?.toString() === p.id?.toString() && c.type === "product",
        );
        return ci
          ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) - ci.quantity) }
          : p;
      });
      const lowStock = updatedProducts.filter(
        (p) => (Number(p.stock) || 0) <= (Number(p.minStock) || 5),
      );
      if (lowStock.length > 0) setStockAlerts(lowStock);
      return updatedProducts;
    });

    setBaskets((prevBaskets) =>
      prevBaskets.map((b) => {
        const ci = cart.find(
          (c) => c.id?.toString() === b.id?.toString() && c.type === "basket",
        );
        return ci
          ? { ...b, stock: Math.max(0, (Number(b.stock) || 0) - ci.quantity) }
          : b;
      }),
    );

    const roleRaw = localStorage.getItem("canasta_access_role");
    const role = roleRaw ? JSON.parse(roleRaw) : "pos";
    const saleItems = cart.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    setSales((prevSales) => [
      ...prevSales,
      {
        id: generateCode("VNT"),
        name:
          saleItems.length > 40
            ? saleItems.substring(0, 40) + "..."
            : saleItems,
        seller: role === "admin" ? "Administrador" : "Cajero",
        revenue: total,
        profit: total - totalCost,
        date: new Date().toISOString(),
        items: cart,
        discountApplied: totalDiscount,
        customerRut: customerRut || "Consumidor Final",
        paymentMethod,
      },
    ]);
    setCart([]);
    setCheckoutStep(null);
    setCustomerRut("");
    showAlert("✅ ¡Venta registrada!", "success");
  };

  const cancelSale = (sale) => {
    if (
      !window.confirm(
        "¿Estás seguro de anular esta venta? Se descontará del dinero ganado y los productos volverán al stock.",
      )
    ) {
      return;
    }

    setSales((prev) => prev.filter((s) => s.id !== sale.id));

    if (sale.items && sale.items.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = sale.items.find(
            (i) => i.id === p.id && i.type === "product",
          );
          if (item) return { ...p, stock: (p.stock || 0) + item.quantity };
          return p;
        }),
      );

      setBaskets((prev) =>
        prev.map((b) => {
          const item = sale.items.find(
            (i) => i.id === b.id && i.type === "basket",
          );
          if (item) return { ...b, stock: (b.stock || 0) + item.quantity };
          return b;
        }),
      );
    }
    showAlert("Venta anulada correctamente", "success");
  };

  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--background)",
        position: "fixed",
        inset: 0,
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* ── Top Bar ─────────────────────────────── */}
      <div
        style={{
          background: "var(--surface)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--surface-border)",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Store size={20} color="var(--primary)" />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--text-main)",
            }}
          >
            {settings?.businessName || "EspeMarket"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {cartCount > 0 && (
            <span
              style={{
                background: "rgba(79,70,229,0.15)",
                color: "var(--primary)",
                border: "1px solid rgba(79,70,229,0.3)",
                borderRadius: "20px",
                padding: "0.2rem 0.65rem",
                fontSize: "0.78rem",
                fontWeight: 700,
              }}
            >
              {cartCount} ítem{cartCount > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => setShowHistory(true)}
            style={{
              background: "var(--panel-alt)",
              border: "1px solid var(--surface-border)",
              color: "var(--text-main)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.35rem",
              borderRadius: "8px",
            }}
          >
            <History size={18} />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                background: "none",
                border: "none",
                color: "var(--danger)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "0.35rem",
              }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── Alert Banner ────────────────────────── */}
      {alert && (
        <div
          style={{
            background:
              alert.type === "success"
                ? "linear-gradient(90deg,#059669,#10b981)"
                : "linear-gradient(90deg,#b91c1c,#ef4444)",
            color: "white",
            padding: "0.55rem 1rem",
            textAlign: "center",
            fontSize: "0.88rem",
            fontWeight: 600,
            flexShrink: 0,
            letterSpacing: "0.01em",
          }}
        >
          {alert.msg}
        </div>
      )}

      {/* ── Stock Alert ──────────────────────────── */}
      {stockAlerts.length > 0 && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            color: "var(--danger)",
            border: "1px solid rgba(239,68,68,0.3)",
            padding: "0.5rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            fontSize: "0.82rem",
          }}
        >
          <span>
            <AlertTriangle
              size={13}
              style={{
                display: "inline",
                marginRight: 5,
                verticalAlign: "middle",
              }}
            />
            Stock bajo: {stockAlerts.map((p) => p.name).join(", ")}
          </span>
          <button
            onClick={() => setStockAlerts([])}
            style={{
              background: "none",
              border: "none",
              color: "var(--danger)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Search ──────────────────────────────── */}
      <div style={{ padding: "0.75rem 0.75rem 0", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "0.8rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            className="glass-input"
            placeholder="Buscar producto o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "2.1rem", fontSize: "0.9rem" }}
          />
        </div>

        {/* Category Chips */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingTop: "0.75rem",
            paddingBottom: "0.25rem",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearchTerm("");
            }}
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "20px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              background:
                selectedCategory === "all"
                  ? "var(--primary)"
                  : "var(--panel-alt)",
              color: selectedCategory === "all" ? "white" : "var(--text-main)",
              border: `1px solid ${selectedCategory === "all" ? "var(--primary)" : "var(--surface-border)"}`,
              fontWeight: 600,
              fontSize: "0.8rem",
              transition: "all 0.2s",
            }}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.name);
                setSearchTerm("");
              }}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "20px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                background:
                  selectedCategory === c.name ? c.color : "var(--panel-alt)",
                color:
                  selectedCategory === c.name ? "white" : "var(--text-main)",
                border: `1px solid ${selectedCategory === c.name ? c.color : "var(--surface-border)"}`,
                fontWeight: 600,
                fontSize: "0.8rem",
                transition: "all 0.2s",
              }}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedCategory("Canasta");
              setSearchTerm("");
            }}
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "20px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              background:
                selectedCategory === "Canasta"
                  ? "var(--secondary)"
                  : "var(--panel-alt)",
              color:
                selectedCategory === "Canasta" ? "white" : "var(--text-main)",
              border: `1px solid ${selectedCategory === "Canasta" ? "var(--secondary)" : "var(--surface-border)"}`,
              fontWeight: 600,
              fontSize: "0.8rem",
              transition: "all 0.2s",
            }}
          >
            Canastas
          </button>
        </div>
      </div>

      {/* ── Product Grid ─────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.65rem 0.75rem 0.5rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.55rem",
          }}
        >
          {filteredItems.map((item) => {
            const hasOffer = (offers || []).some(
              (o) =>
                o.active &&
                o.targetId?.toString() === item.id?.toString() &&
                o.targetType === item.type,
            );
            const inStock = (Number(item.stock) || 0) > 0;
            const inCart = cart.find(
              (c) => c.id === item.id && c.type === item.type,
            );
            const accentColor =
              item.type === "basket"
                ? "var(--secondary)"
                : categories?.find((c) => c.name === item.category)?.color ||
                  "var(--primary)";

            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => addToCart(item)}
                disabled={!inStock}
                style={{
                  background: inCart ? "rgba(79,70,229,0.1)" : "var(--surface)",
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${inCart ? "rgba(79,70,229,0.4)" : "var(--surface-border)"}`,
                  borderTop: `3px solid ${inStock ? accentColor : "var(--text-muted)"}`,
                  borderRadius: "12px",
                  padding: "0.8rem 0.7rem",
                  cursor: inStock ? "pointer" : "not-allowed",
                  opacity: inStock ? 1 : 0.45,
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  WebkitTapHighlightColor: "transparent",
                  width: "100%",
                  transition: "transform 0.1s, box-shadow 0.1s",
                  boxShadow: inCart
                    ? "0 0 0 1px rgba(79,70,229,0.2)"
                    : "var(--glass-shadow)",
                  position: "relative",
                }}
                onTouchStart={(e) =>
                  (e.currentTarget.style.transform = "scale(0.95)")
                }
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {inCart && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0.35rem",
                      right: "0.4rem",
                      background: "var(--primary)",
                      color: "white",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                    }}
                  >
                    {inCart.quantity}
                  </span>
                )}
                {item.imageUrl && (
                  <div
                    style={{
                      width: "100%",
                      height: "80px",
                      marginBottom: "0.4rem",
                      borderRadius: "8px",
                      overflow: "hidden",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    lineHeight: 1.25,
                    color: "var(--text-main)",
                    paddingRight: inCart ? "1.4rem" : 0,
                  }}
                >
                  {item.name}
                </span>
                {hasOffer && (
                  <span
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      color: "var(--secondary)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      fontSize: "0.6rem",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "4px",
                      fontWeight: 700,
                      alignSelf: "flex-start",
                    }}
                  >
                    ⭐ PROMO
                  </span>
                )}
                <span
                  style={{
                    color: "var(--primary)",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    marginTop: "auto",
                  }}
                >
                  {formatCLP(Number(item.sellPrice) || 0)}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: inStock ? "var(--text-muted)" : "var(--danger)",
                  }}
                >
                  {inStock ? `Stock: ${item.stock}` : "Sin stock"}
                </span>
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <p
              style={{
                color: "var(--text-muted)",
                gridColumn: "1/-1",
                textAlign: "center",
                padding: "2rem",
                fontSize: "0.9rem",
              }}
            >
              No hay productos.
            </p>
          )}
        </div>
      </div>

      {/* ── Bottom Checkout Bar ──────────────────── */}
      {!checkoutStep && cartCount > 0 && (
        <div
          style={{
            background: "var(--surface)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid var(--surface-border)",
            padding: "0.65rem 0.75rem",
            flexShrink: 0,
          }}
        >
          {/* Cart chips */}
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              overflowX: "auto",
              marginBottom: "0.55rem",
              paddingBottom: "0.1rem",
            }}
          >
            {cart.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  background: "var(--panel-alt)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: "20px",
                  padding: "0.2rem 0.55rem",
                  whiteSpace: "nowrap",
                  fontSize: "0.76rem",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {item.quantity}× {item.name}
                </span>
                <button
                  onClick={() => removeFromCart(item.id, item.type)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "0.85rem",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {totalDiscount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.78rem",
                color: "var(--secondary)",
                marginBottom: "0.35rem",
              }}
            >
              <span>Descuento promocional</span>
              <span>-{formatCLP(totalDiscount)}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setCart([])}
              className="glass-button secondary"
              style={{
                padding: "0.7rem 0.75rem",
                flexShrink: 0,
                color: "var(--danger)",
                borderColor: "rgba(239,68,68,0.3)",
              }}
            >
              <Trash2 size={17} />
            </button>
            <button
              onClick={() => setCheckoutStep("rut")}
              className="glass-button"
              style={{
                flex: 1,
                fontSize: "1rem",
                padding: "0.85rem",
                background:
                  "linear-gradient(135deg, var(--secondary-dark), var(--secondary))",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <DollarSign size={18} />
              Cobrar {formatCLP(total)}
            </button>
          </div>
        </div>
      )}

      {/* ── RUT Bottom Sheet ─────────────────────── */}
      {checkoutStep === "rut" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--modal-overlay)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 200,
          }}
        >
          <div
            style={{
              background: "var(--modal-bg)",
              borderRadius: "24px 24px 0 0",
              padding: "1.25rem 1.5rem 2.5rem",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              borderTop: "3px solid var(--primary)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: "36px",
                height: "4px",
                background: "var(--surface-border)",
                borderRadius: "2px",
                margin: "0 auto",
              }}
            />

            <div style={{ textAlign: "center" }}>
              <h3
                style={{
                  margin: "0 0 0.2rem",
                  fontSize: "1.15rem",
                  color: "var(--modal-text)",
                  fontWeight: 700,
                }}
              >
                ¿RUT del cliente?
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--modal-text-muted)",
                  fontSize: "0.83rem",
                }}
              >
                Opcional · puedes dejarlo vacío
              </p>
            </div>

            <input
              type="text"
              value={customerRut}
              onChange={(e) => setCustomerRut(formatRut(e.target.value))}
              placeholder="12.345.678-9"
              maxLength={12}
              autoFocus
              style={{
                textAlign: "center",
                fontSize: "1.15rem",
                padding: "0.9rem",
                letterSpacing: "0.06em",
                fontFamily: "monospace",
                background: "var(--modal-input-bg)",
                border: "1px solid var(--modal-input-border)",
                borderRadius: "12px",
                outline: "none",
                width: "100%",
                color: "var(--modal-text)",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "0.65rem",
              }}
            >
              <button
                onClick={() => {
                  setCheckoutStep(null);
                  setCustomerRut("");
                }}
                style={{
                  padding: "0.85rem",
                  background: "var(--modal-btn-ghost)",
                  border: "1px solid var(--modal-btn-ghost-border)",
                  borderRadius: "12px",
                  color: "var(--modal-text)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => setCheckoutStep("payment")}
                className="glass-button"
                style={{
                  padding: "0.85rem",
                  fontSize: "1rem",
                  borderRadius: "12px",
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Bottom Sheet ─────────────────── */}
      {checkoutStep === "payment" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--modal-overlay)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 200,
          }}
        >
          <div
            style={{
              background: "var(--modal-bg)",
              borderRadius: "24px 24px 0 0",
              padding: "1.25rem 1.5rem 2.5rem",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              borderTop: "3px solid var(--secondary)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: "36px",
                height: "4px",
                background: "var(--surface-border)",
                borderRadius: "2px",
                margin: "0 auto",
              }}
            />

            <h3
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: "1.15rem",
                color: "var(--modal-text)",
                fontWeight: 700,
              }}
            >
              ¿Cómo paga?
            </h3>

            {/* Payment Options */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.65rem",
              }}
            >
              {[
                {
                  id: "Efectivo",
                  emoji: "💵",
                  label: "Efectivo",
                  color: "#16a34a",
                  colorBg: "rgba(22,163,74,0.1)",
                  colorBorder: "rgba(22,163,74,0.4)",
                },
                {
                  id: "Transferencia",
                  emoji: "📲",
                  label: "Transferencia",
                  color: "#2563eb",
                  colorBg: "rgba(37,99,235,0.1)",
                  colorBorder: "rgba(37,99,235,0.4)",
                },
              ].map((m) => {
                const selected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      padding: "1.25rem 1rem",
                      borderRadius: "14px",
                      cursor: "pointer",
                      background: selected ? m.color : "var(--modal-surface)",
                      border: `2px solid ${selected ? m.color : "var(--modal-btn-ghost-border)"}`,
                      color: selected ? "white" : "var(--modal-text-muted)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.35rem",
                      transition: "all 0.15s",
                      boxShadow: selected ? `0 4px 20px ${m.color}55` : "none",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>
                      {m.emoji}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {m.label}
                    </span>
                    {selected && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.68rem",
                          background: "rgba(255,255,255,0.22)",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          color: "white",
                          fontWeight: 700,
                        }}
                      >
                        <Check size={10} /> Seleccionado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Total */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, var(--secondary-dark), var(--secondary))",
                borderRadius: "12px",
                padding: "0.9rem 1.1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Total a cobrar
              </span>
              <span
                style={{ color: "white", fontWeight: 800, fontSize: "1.4rem" }}
              >
                {formatCLP(total)}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "0.65rem",
              }}
            >
              <button
                onClick={() => setCheckoutStep("rut")}
                style={{
                  padding: "0.85rem",
                  background: "var(--modal-btn-ghost)",
                  border: "1px solid var(--modal-btn-ghost-border)",
                  borderRadius: "12px",
                  color: "var(--modal-text)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                }}
              >
                ← Atrás
              </button>
              <button
                onClick={processCheckout}
                className="glass-button"
                style={{
                  padding: "0.85rem",
                  fontSize: "1rem",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, var(--secondary-dark), var(--secondary))",
                }}
              >
                ✅ Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sales History Overlay ──────────────────── */}
      {showHistory && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--background)",
            zIndex: 300,
            display: "flex",
            flexDirection: "column",
            animation: "slideInRight 0.2s ease-out",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--surface-border)",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <History size={20} color="var(--primary)" />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "var(--text-main)",
                }}
              >
                Historial de Ventas
              </span>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                background: "var(--panel-alt)",
                border: "1px solid var(--surface-border)",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.35rem",
                borderRadius: "8px",
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {sales.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--text-muted)",
                }}
              >
                <History
                  size={48}
                  opacity={0.2}
                  style={{ marginBottom: "1rem" }}
                />
                <p style={{ margin: 0 }}>No hay ventas registradas.</p>
              </div>
            ) : (
              sales
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((sale) => {
                  const date = new Date(sale.date);
                  return (
                    <div
                      key={sale.id}
                      style={{
                        background: "var(--surface)",
                        borderRadius: "16px",
                        border: "1px solid var(--surface-border)",
                        padding: "1rem",
                        boxShadow: "var(--glass-shadow)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "var(--primary)",
                              fontSize: "0.85rem",
                              fontFamily: "monospace",
                              marginBottom: "0.2rem",
                            }}
                          >
                            #{sale.id}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            {date.toLocaleDateString("es-CL")} ·{" "}
                            {date.toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <span
                          style={{
                            background: "var(--panel-alt)",
                            border: "1px solid var(--surface-border)",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: "var(--text-main)",
                          }}
                        >
                          {sale.paymentMethod || "Efectivo"}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-main)",
                          lineHeight: 1.4,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{sale.name}</span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "0.25rem",
                        }}
                      >
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Total Venta
                          </span>
                          <span
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: 800,
                              color: "var(--text-main)",
                            }}
                          >
                            {formatCLP(Number(sale.revenue) || 0)}
                          </span>
                        </div>

                        <button
                          onClick={() => cancelSale(sale)}
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "var(--danger)",
                            cursor: "pointer",
                            padding: "0.45rem 0.75rem",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          <RotateCcw size={14} /> Anular
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilePOS;
