import React, { useState } from "react";
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  ShoppingBag,
  Package,
} from "lucide-react";
import { formatCLP } from "../utils/format";

const Offers = ({ offers, setOffers, products, baskets }) => {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    targetType: "product",
    targetId: "",
    type: "bulk",
    bulkMinQty: 3,
    bulkNewPrice: 0,
    nxmBuy: 3,
    nxmPay: 2,
    discountPercent: 10,
    active: true,
  });

  const allItems = [
    ...products.map((p) => ({ ...p, _type: "product" })),
    ...baskets.map((b) => ({ ...b, _type: "basket" })),
  ];

  const handleSave = () => {
    if (!form.name || !form.targetId)
      return alert("Completa el nombre y selecciona un producto/canasta.");

    if (editingId && editingId !== "new") {
      setOffers(
        offers.map((o) => (o.id === editingId ? { ...o, ...form } : o)),
      );
    } else {
      setOffers([{ ...form, id: Date.now().toString() }, ...offers]);
    }
    setEditingId(null);
  };

  const handleEdit = (offer) => {
    setForm({ ...offer });
    setEditingId(offer.id);
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Eliminar esta oferta?")) {
      setOffers(offers.filter((o) => o.id !== id));
    }
  };

  const toggleActive = (id) => {
    setOffers(
      offers.map((o) => (o.id === id ? { ...o, active: !o.active } : o)),
    );
  };

  return (
    <div>
      <div
        className="header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--danger)",
            }}
          >
            <Tag size={28} /> Creador de Ofertas
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Configura promociones automáticas para la caja.
          </p>
        </div>
        <button
          className="glass-button"
          onClick={() => {
            setEditingId("new");
            setForm({
              name: "",
              targetType: "product",
              targetId: "",
              type: "bulk",
              bulkMinQty: 3,
              bulkNewPrice: 0,
              nxmBuy: 3,
              nxmPay: 2,
              discountPercent: 10,
              active: true,
            });
          }}
          style={{ background: "var(--danger)", color: "white" }}
        >
          <Plus size={18} /> Nueva Oferta
        </button>
      </div>

      {editingId && (
        <div
          className="glass-panel"
          style={{
            padding: "2rem",
            marginBottom: "2rem",
            borderTop: "4px solid var(--danger)",
          }}
        >
          <h3 style={{ marginBottom: "1.5rem" }}>
            {editingId === "new" ? "Crear Nueva Oferta" : "Editar Oferta"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                Nombre de la Promoción
              </label>
              <input
                type="text"
                className="glass-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Llevando 3 a luca"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                Tipo de Promoción
              </label>
              <select
                className="glass-input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: "100%" }}
              >
                <option value="bulk">
                  Precio por Mayor (Lleva X por $Y c/u)
                </option>
                <option value="nxm">Promoción NxM (Lleva X, Paga Y)</option>
                <option value="percentage">Descuento Directo (%)</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                Aplicar a:
              </label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <select
                  className="glass-input"
                  value={form.targetType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      targetType: e.target.value,
                      targetId: "",
                    })
                  }
                  style={{ width: "150px" }}
                >
                  <option value="product">Producto</option>
                  <option value="basket">Canasta</option>
                </select>
                <select
                  className="glass-input"
                  value={form.targetId}
                  onChange={(e) =>
                    setForm({ ...form, targetId: e.target.value })
                  }
                  style={{ flex: 1 }}
                >
                  <option value="">-- Seleccionar --</option>
                  {allItems
                    .filter((i) => i._type === form.targetType)
                    .map((item) => (
                      <option key={item.id} value={item.id.toString()}>
                        {item.name} ({formatCLP(item.sellPrice)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {form.type === "bulk" && (
              <>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Cantidad Mínima
                    </label>
                    <input
                      type="number"
                      className="glass-input"
                      value={form.bulkMinQty === 0 ? "" : form.bulkMinQty}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bulkMinQty:
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
                        })
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "#10B981",
                      }}
                    >
                      Aplicar Descuento (%)
                    </label>
                    <input
                      type="number"
                      className="glass-input"
                      placeholder="Opcional..."
                      onChange={(e) => {
                        const perc = parseFloat(e.target.value);
                        if (form.targetId && !isNaN(perc)) {
                          const tgt = allItems.find(
                            (i) =>
                              i.id?.toString() === form.targetId?.toString() &&
                              i._type === form.targetType,
                          );
                          if (tgt)
                            setForm({
                              ...form,
                              bulkNewPrice: Math.round(
                                tgt.sellPrice * (1 - perc / 100),
                              ),
                            });
                        }
                      }}
                      style={{
                        width: "100%",
                        borderColor: "rgba(16, 185, 129, 0.4)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Precio Final c/u ($)
                    </label>
                    <input
                      type="number"
                      className="glass-input"
                      value={form.bulkNewPrice === 0 ? "" : form.bulkNewPrice}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bulkNewPrice:
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
                        })
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </>
            )}

            {form.type === "nxm" && (
              <>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Lleva (Cantidad)
                  </label>
                  <input
                    type="number"
                    className="glass-input"
                    value={form.nxmBuy === 0 ? "" : form.nxmBuy}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nxmBuy:
                          e.target.value === "" ? "" : parseInt(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Paga solo (Cantidad)
                  </label>
                  <input
                    type="number"
                    className="glass-input"
                    value={form.nxmPay === 0 ? "" : form.nxmPay}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nxmPay:
                          e.target.value === "" ? "" : parseInt(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              </>
            )}

            {form.type === "percentage" && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Porcentaje de Descuento (%)
                  </label>
                  <input
                    type="number"
                    className="glass-input"
                    value={
                      form.discountPercent === 0 ? "" : form.discountPercent
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountPercent:
                          e.target.value === "" ? "" : parseInt(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                {form.targetId && (
                  <div
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      background: "var(--surface)",
                      borderRadius: "8px",
                      border: "1px solid var(--surface-border)",
                    }}
                  >
                    {(() => {
                      const tgt = allItems.find(
                        (i) =>
                          i.id?.toString() === form.targetId?.toString() &&
                          i._type === form.targetType,
                      );
                      if (!tgt) return null;
                      const finalPrice =
                        tgt.sellPrice * (1 - form.discountPercent / 100);
                      return (
                        <span style={{ color: "var(--text-muted)" }}>
                          Precio Final:{" "}
                          <strong
                            style={{ color: "#10B981", fontSize: "1.1rem" }}
                          >
                            {formatCLP(finalPrice)}
                          </strong>
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}
          >
            <button
              className="glass-button secondary"
              onClick={() => setEditingId(null)}
            >
              Cancelar
            </button>
            <button
              className="glass-button"
              style={{ background: "#10B981", color: "white" }}
              onClick={handleSave}
            >
              Guardar Oferta
            </button>
          </div>
        </div>
      )}

      <div className="grid-cards">
        {offers.length === 0 && !editingId && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "3rem",
              color: "var(--text-muted)",
              background: "var(--panel-bg)",
              borderRadius: "12px",
            }}
          >
            <Tag size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <p>
              No tienes ofertas activas. ¡Crea una para impulsar tus ventas!
            </p>
          </div>
        )}

        {offers.map((offer) => {
          const target = allItems.find(
            (i) =>
              i.id?.toString() === offer.targetId?.toString() &&
              i._type === offer.targetType,
          );

          let promoUnitRevenue = 0;
          let promoUnitCost = target ? target.cost : 0;
          let profitText = "";
          let profitColor = "var(--text-muted)";

          if (target) {
            if (offer.type === "bulk") {
              promoUnitRevenue = offer.bulkNewPrice;
            } else if (offer.type === "nxm") {
              promoUnitRevenue =
                (target.sellPrice * offer.nxmPay) / offer.nxmBuy;
            } else if (offer.type === "percentage") {
              promoUnitRevenue =
                target.sellPrice * (1 - offer.discountPercent / 100);
            }

            const marginAmount = promoUnitRevenue - promoUnitCost;
            const marginPercent =
              promoUnitRevenue > 0
                ? (marginAmount / promoUnitRevenue) * 100
                : 0;

            if (marginAmount > 0) {
              profitText = `+${formatCLP(marginAmount)} ganancia (${marginPercent.toFixed(1)}% margen)`;
              profitColor = "#10B981";
            } else if (marginAmount === 0) {
              profitText = `Al costo (0% margen)`;
              profitColor = "#f59e0b";
            } else {
              profitText = `${formatCLP(marginAmount)} PÉRDIDA (${marginPercent.toFixed(1)}% margen)`;
              profitColor = "var(--danger)";
            }
          }

          return (
            <div
              key={offer.id}
              className="glass-panel"
              style={{
                padding: "1.5rem",
                borderLeft: `4px solid ${offer.active ? "#10B981" : "var(--text-muted)"}`,
                opacity: offer.active ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    color: "var(--text-main)",
                  }}
                >
                  {offer.name}
                </h3>
                <button
                  onClick={() => toggleActive(offer.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: offer.active ? "#10B981" : "var(--text-muted)",
                  }}
                  title={offer.active ? "Desactivar" : "Activar"}
                >
                  {offer.active ? (
                    <CheckCircle size={24} />
                  ) : (
                    <XCircle size={24} />
                  )}
                </button>
              </div>

              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--text-muted)",
                  marginBottom: "1rem",
                }}
              >
                {offer.targetType === "product" ? (
                  <Package size={16} />
                ) : (
                  <ShoppingBag size={16} />
                )}
                {target ? target.name : "Artículo eliminado"}
              </p>

              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "var(--danger)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                }}
              >
                {offer.type === "bulk" &&
                  `Llevando ${offer.bulkMinQty}+ queda a ${formatCLP(offer.bulkNewPrice)} c/u`}
                {offer.type === "nxm" &&
                  `¡Lleva ${offer.nxmBuy} y paga solo ${offer.nxmPay}!`}
                {offer.type === "percentage" &&
                  `${offer.discountPercent}% de Descuento`}
              </div>

              {target && (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--surface-border)",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    marginBottom: "1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>
                    Margen c/u en promo:
                  </span>
                  <span style={{ fontWeight: "bold", color: profitColor }}>
                    {profitText}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  borderTop: "1px solid var(--surface-border)",
                  paddingTop: "1rem",
                }}
              >
                <button
                  onClick={() => handleEdit(offer)}
                  className="glass-button secondary"
                  style={{ flex: 1, padding: "0.5rem" }}
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="glass-button secondary"
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    color: "var(--danger)",
                    borderColor: "var(--danger)",
                  }}
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Offers;
