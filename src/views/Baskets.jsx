import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ShoppingBasket,
  DollarSign,
  Eye,
  EyeOff,
  Layers,
  Copy,
  FileText,
  CheckSquare,
  CheckCircle,
  TrendingUp,
  Info,
  PieChart,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatCLP, generateCode } from "../utils/format";

const parseQuantity = (val) => {
  if (val === "" || val === undefined) return 0;
  if (typeof val === "string") {
    const q = parseFloat(val.replace(",", "."));
    return isNaN(q) ? 0 : q;
  }
  return val;
};

const Baskets = ({
  products,
  setProducts,
  baskets,
  setBaskets,
  settings,
  sales,
  setSales,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [currentBasket, setCurrentBasket] = useState(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [checklistId, setChecklistId] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [infoBasket, setInfoBasket] = useState(null);

  const startCreate = () => {
    setCurrentBasket({
      id: Date.now(),
      name: "Nueva Canasta",
      items: [], // { productId, quantity, name, cost, sellPrice, unit }
      sellPrice: 0,
      suggestedPrice: 0,
      cost: 0,
      extraCosts: 0,
      stock: 0,
    });
    setEditingId("new");
  };

  const startEdit = (basket) => {
    setCurrentBasket({ ...basket });
    setEditingId(basket.id);
  };

  const cancelEdit = () => {
    setCurrentBasket(null);
    setEditingId(null);
  };

  const saveBasket = () => {
    if (!currentBasket.name.trim()) {
      alert("La canasta necesita un nombre");
      return;
    }

    setBaskets((prev) => {
      if (editingId === "new") {
        return [...prev, currentBasket];
      }
      return prev.map((b) => (b.id === editingId ? currentBasket : b));
    });
    setEditingId(null);
    setCurrentBasket(null);
  };

  const deleteBasket = (id) => {
    if (
      window.confirm(
        "¿Eliminar esta canasta? (Su stock armado será desarmado y devuelto al inventario de productos)",
      )
    ) {
      const basketToDelete = baskets.find((b) => b.id === id);
      if (basketToDelete && basketToDelete.stock > 0) {
        // Return products to inventory
        setProducts((prevProducts) =>
          prevProducts.map((p) => {
            const itemInBasket = basketToDelete.items.find(
              (i) => i.productId === p.id,
            );
            if (itemInBasket) {
              return {
                ...p,
                stock:
                  (p.stock || 0) + itemInBasket.quantity * basketToDelete.stock,
              };
            }
            return p;
          }),
        );
      }
      setBaskets(baskets.filter((b) => b.id !== id));
    }
  };

  const updateStock = (id, newStock) => {
    if (newStock < 0) return;

    const basket = baskets.find((b) => b.id === id);
    if (!basket) return;

    const diff = newStock - (basket.stock || 0);

    // Check if we have enough product stock to build
    if (diff > 0) {
      let canBuild = true;
      let missingProducts = [];
      basket.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const needed = item.quantity * diff;
        if (!prod || (prod.stock || 0) < needed) {
          canBuild = false;
          missingProducts.push(
            `${item.name} (Faltan ${needed - (prod?.stock || 0)})`,
          );
        }
      });

      if (!canBuild) {
        alert(
          `No hay suficiente stock de productos para armar esta cantidad:\n- ${missingProducts.join("\n- ")}`,
        );
        return;
      }
    }

    // Update products stock
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const itemInBasket = basket.items.find((i) => i.productId === p.id);
        if (itemInBasket) {
          // if diff > 0 (building), subtract from product stock. if diff < 0 (dismantling), add to product stock.
          return { ...p, stock: (p.stock || 0) - itemInBasket.quantity * diff };
        }
        return p;
      }),
    );

    setBaskets(
      baskets.map((b) => (b.id === id ? { ...b, stock: newStock } : b)),
    );
  };

  const duplicateBasket = (basket) => {
    const newBasket = {
      ...basket,
      id: Date.now(),
      name: `${basket.name} (Copia)`,
      stock: 0,
    };
    setBaskets((prev) => [...prev, newBasket]);
  };

  const sellBasket = (basket) => {
    if ((basket.stock || 0) <= 0) {
      alert(
        `Esta canasta no tiene stock. Debes armar al menos 1 unidad (presiona +) antes de venderla.`,
      );
      return;
    }

    setBaskets(
      baskets.map((b) =>
        b.id === basket.id ? { ...b, stock: basket.stock - 1 } : b,
      ),
    );

    const profit = basket.sellPrice - basket.cost;
    const newSale = {
      id: generateCode("VNT"),
      date: new Date().toISOString(),
      name: basket.name,
      profit: profit,
      revenue: basket.sellPrice,
      items: [
        {
          id: basket.id,
          type: "basket",
          quantity: 1,
          name: basket.name,
          sellPrice: basket.sellPrice,
          cost: basket.cost,
        },
      ],
    };
    setSales((prev) => [...prev, newSale]);
    alert("¡Venta registrada con éxito!");
  };

  const toggleChecklist = (id) => {
    if (checklistId === id) {
      setChecklistId(null);
    } else {
      setChecklistId(id);
      setCheckedItems({});
    }
  };

  const toggleCheck = (itemIndex) => {
    setCheckedItems((prev) => ({ ...prev, [itemIndex]: !prev[itemIndex] }));
  };

  const exportQuote = async (basket) => {
    // We create a temporary hidden div to render the quote cleanly
    const quoteDiv = document.createElement("div");
    quoteDiv.style.position = "absolute";
    quoteDiv.style.left = "-9999px";
    quoteDiv.style.top = "-9999px";
    quoteDiv.style.width = "700px";
    quoteDiv.style.padding = "50px";
    quoteDiv.style.background = "#ffffff"; // White background for professional look
    quoteDiv.style.color = "#1f2937"; // Dark gray text
    quoteDiv.style.fontFamily =
      '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    quoteDiv.style.borderRadius = "0px";

    const today = new Date();
    const dateStr = today.toLocaleDateString("es-CL");
    const invoiceNum = generateCode("COT");

    quoteDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${settings?.logo ? `<img src="${settings.logo}" style="max-height: 60px; object-fit: contain;" />` : ""}
          <div>
            <h1 style="color: #111827; font-size: 28px; margin: 0 0 5px 0; font-weight: 800; letter-spacing: -0.5px;">COTIZACIÓN</h1>
            <h2 style="font-size: 16px; margin: 0; color: #6b7280; font-weight: 500;">${settings?.businessName || "Documento Comercial"}</h2>
            ${settings?.phone ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">${settings.phone}</p>` : ""}
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #4b5563;"><strong>Fecha:</strong> ${dateStr}</p>
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Nº Documento:</strong> #${invoiceNum}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Detalle del Paquete</h3>
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">${basket.name}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="border-bottom: 2px solid #cbd5e1; text-align: left;">
            <th style="padding: 12px 0; color: #475569; font-size: 14px; text-transform: uppercase;">Cant.</th>
            <th style="padding: 12px 0; color: #475569; font-size: 14px; text-transform: uppercase;">Descripción del Producto</th>
          </tr>
        </thead>
        <tbody>
          ${basket.items
            .map(
              (item) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 16px 0; font-weight: 600; color: #334155; width: 100px;">
                ${item.quantity === "" ? 0 : item.quantity} <span style="font-size: 12px; color: #94a3b8; font-weight: 400;">${item.unit}</span>
              </td>
              <td style="padding: 16px 0; color: #1e293b; font-weight: 500;">
                ${item.name}
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 300px; text-align: right;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
            <span style="color: #64748b;">Subtotal</span>
            <span style="color: #64748b;">---</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <span style="font-size: 16px; font-weight: 600; color: #475569;">TOTAL A PAGAR</span>
            <span style="font-size: 26px; font-weight: 800; color: #111827;">${formatCLP(basket.sellPrice)}</span>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        <p style="margin: 0;">Los valores expresados en este documento están sujetos a confirmación y disponibilidad de stock.</p>
        <p style="margin: 5px 0 0 0;">Gracias por su preferencia.</p>
      </div>
    `;

    document.body.appendChild(quoteDiv);

    try {
      const canvas = await html2canvas(quoteDiv, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Cotizacion_${(basket.name || "Canasta").replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      alert("Hubo un error al generar la cotización.");
    } finally {
      document.body.removeChild(quoteDiv);
    }
  };

  const addItemToBasket = (productId) => {
    const product = products.find((p) => p.id === parseInt(productId));
    if (!product) return;

    const existingItemIndex = currentBasket.items.findIndex(
      (i) => i.productId === product.id,
    );
    let newItems = [...currentBasket.items];

    if (existingItemIndex >= 0) {
      newItems[existingItemIndex].quantity += 1;
    } else {
      newItems.push({
        productId: product.id,
        name: product.name,
        cost: product.cost,
        sellPrice: product.sellPrice || 0,
        unit: product.unit,
        quantity: 1,
      });
    }

    recalculateBasket(
      newItems,
      currentBasket.sellPrice,
      currentBasket.extraCosts,
    );
  };

  const updateItemQuantity = (productId, rawValue) => {
    let newItems = [...currentBasket.items];
    const index = newItems.findIndex((i) => i.productId === productId);
    if (index >= 0) {
      if (/^[0-9]*[.,]?[0-9]*$/.test(rawValue)) {
        newItems[index].quantity = rawValue;
      }
    }

    recalculateBasket(
      newItems,
      currentBasket.sellPrice,
      currentBasket.extraCosts,
    );
  };

  const removeItem = (productId) => {
    const newItems = currentBasket.items.filter(
      (i) => i.productId !== productId,
    );
    recalculateBasket(
      newItems,
      currentBasket.sellPrice,
      currentBasket.extraCosts,
    );
  };

  const recalculateBasket = (items, sellPrice, extraCosts) => {
    const itemsCost = items.reduce(
      (acc, item) => acc + item.cost * parseQuantity(item.quantity),
      0,
    );
    const totalCost = itemsCost + (parseFloat(extraCosts) || 0);
    const suggestedPrice =
      items.reduce(
        (acc, item) =>
          acc + (item.sellPrice || 0) * parseQuantity(item.quantity),
        0,
      ) + (parseFloat(extraCosts) || 0);

    setCurrentBasket({
      ...currentBasket,
      items,
      cost: totalCost,
      suggestedPrice,
      extraCosts: parseFloat(extraCosts) || 0,
      sellPrice: parseFloat(sellPrice) || 0,
    });
  };

  if (editingId !== null) {
    const profit = currentBasket.sellPrice - currentBasket.cost;
    const margin =
      currentBasket.sellPrice > 0
        ? (profit / currentBasket.sellPrice) * 100
        : 0;

    return (
      <div>
        <div className="header">
          <h1>{editingId === "new" ? "Crear Canasta" : "Editar Canasta"}</h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button className="glass-button secondary" onClick={cancelEdit}>
              <X size={18} /> Cancelar
            </button>
            <button className="glass-button" onClick={saveBasket}>
              <Save size={18} /> Guardar Canasta
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 350px",
            gap: "2rem",
          }}
        >
          <div className="glass-panel" style={{ padding: "2rem" }}>
            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                Nombre de la Canasta
              </label>
              <input
                className="glass-input"
                value={currentBasket.name}
                onChange={(e) =>
                  setCurrentBasket({ ...currentBasket, name: e.target.value })
                }
                placeholder="Ej: Canasta Familiar Básica"
                style={{ fontSize: "1.25rem", fontWeight: "bold" }}
              />
            </div>

            <div
              style={{
                marginBottom: "1.5rem",
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
                  Agregar Producto
                </label>
                <select
                  className="glass-input"
                  onChange={(e) => {
                    if (e.target.value) addItemToBasket(e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecciona un producto...
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCLP(p.cost)}/{p.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currentBasket.items.length > 0 ? (
              <div
                className="table-container"
                style={{ border: "none", background: "var(--panel-alt)" }}
              >
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Costo Unit.</th>
                      <th>Venta Unit.</th>
                      <th style={{ width: "120px" }}>Cantidad</th>
                      <th>Subtotal Costo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBasket.items.map((item) => (
                      <tr key={item.productId}>
                        <td>
                          {item.name}{" "}
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            ({item.unit})
                          </span>
                        </td>
                        <td>{formatCLP(item.cost)}</td>
                        <td>{formatCLP(item.sellPrice || 0)}</td>
                        <td>
                          <input
                            type="text"
                            className="glass-input"
                            style={{ padding: "0.4rem", width: "80px" }}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(item.productId, e.target.value)
                            }
                          />
                        </td>
                        <td>
                          {formatCLP(item.cost * parseQuantity(item.quantity))}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => removeItem(item.productId)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--danger)",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  background: "rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  color: "var(--text-muted)",
                }}
              >
                No hay productos en esta canasta.
              </div>
            )}
          </div>

          <div
            className="glass-panel"
            style={{ padding: "2rem", height: "fit-content" }}
          >
            <h3
              style={{
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <DollarSign size={20} color="var(--primary)" />
              Resumen Financiero
            </h3>

            <div
              style={{
                marginBottom: "1.5rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px dashed var(--surface-border)",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                Costos Extra (Packaging, Envío)
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  className="glass-input"
                  style={{ paddingLeft: "2rem" }}
                  value={currentBasket.extraCosts || ""}
                  onChange={(e) =>
                    recalculateBasket(
                      currentBasket.items,
                      currentBasket.sellPrice,
                      e.target.value,
                    )
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Costo Total:</span>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                {formatCLP(currentBasket.cost)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1rem",
                paddingBottom: "1rem",
                borderBottom: "1px solid var(--surface-border)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                Precio Sugerido:
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{ fontWeight: "bold", color: "var(--text-muted)" }}
                >
                  {formatCLP(currentBasket.suggestedPrice || 0)}
                </span>
                <button
                  onClick={() =>
                    recalculateBasket(
                      currentBasket.items,
                      currentBasket.suggestedPrice,
                      currentBasket.extraCosts,
                    )
                  }
                  style={{
                    background: "var(--primary)",
                    border: "none",
                    color: "white",
                    borderRadius: "4px",
                    padding: "0.2rem 0.5rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                  title="Usar precio sugerido"
                >
                  Usar
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                Precio de Venta
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  className="glass-input"
                  style={{
                    paddingLeft: "2rem",
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                    color: "#10B981",
                  }}
                  value={currentBasket.sellPrice}
                  onChange={(e) =>
                    recalculateBasket(
                      currentBasket.items,
                      e.target.value,
                      currentBasket.extraCosts,
                    )
                  }
                />
              </div>
            </div>

            <div
              style={{
                background: "var(--panel-alt)",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Ganancia Neta:
                </span>
                <span
                  style={{
                    fontWeight: "bold",
                    color: profit >= 0 ? "#10B981" : "var(--danger)",
                  }}
                >
                  {formatCLP(profit)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Margen:</span>
                <span
                  className={`badge ${margin > 30 ? "success" : ""}`}
                  style={{
                    background:
                      margin > 30
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(255,255,255,0.1)",
                  }}
                >
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Canastas Armadas</h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            className="glass-button secondary"
            onClick={() => setShowAllDetails(!showAllDetails)}
          >
            {showAllDetails ? <EyeOff size={18} /> : <Layers size={18} />}
            {showAllDetails ? "Ocultar Detalles" : "Ver Todo"}
          </button>
          <button className="glass-button" onClick={startCreate}>
            <Plus size={18} /> Nueva Canasta
          </button>
        </div>
      </div>

      <div className="grid-cards">
        {baskets.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              gridColumn: "1 / -1",
              padding: "4rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <ShoppingBasket
              size={48}
              style={{ margin: "0 auto 1rem", opacity: 0.5 }}
            />
            <p>Aún no has armado ninguna canasta.</p>
          </div>
        ) : (
          baskets.map((basket) => {
            const profit = basket.sellPrice - basket.cost;
            const margin =
              basket.sellPrice > 0 ? (profit / basket.sellPrice) * 100 : 0;

            return (
              <div
                key={basket.id}
                className="glass-panel"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div
                  style={{
                    padding: "1.5rem",
                    borderBottom: "1px solid var(--surface-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h3 style={{ fontSize: "1.25rem", margin: 0 }}>
                      {basket.name}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--panel-alt)",
                        borderRadius: "8px",
                        border: "1px solid var(--surface-border)",
                      }}
                      title="Stock Disponible"
                    >
                      <button
                        onClick={() =>
                          updateStock(basket.id, (basket.stock || 0) - 1)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-main)",
                          cursor: "pointer",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "8px 0 0 8px",
                        }}
                      >
                        -
                      </button>
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          width: "24px",
                          textAlign: "center",
                          color:
                            (basket.stock || 0) > 0
                              ? "#10B981"
                              : "var(--text-muted)",
                        }}
                      >
                        {basket.stock || 0}
                      </span>
                      <button
                        onClick={() =>
                          updateStock(basket.id, (basket.stock || 0) + 1)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-main)",
                          cursor: "pointer",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0 8px 8px 0",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p
                    style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}
                  >
                    {basket.items.length} productos incluidos
                  </p>
                </div>

                <div style={{ padding: "1.5rem", flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>Costo:</span>
                    <span>{formatCLP(basket.cost)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>Venta:</span>
                    <span style={{ fontWeight: "bold" }}>
                      {formatCLP(basket.sellPrice)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "1rem",
                      paddingTop: "1rem",
                      borderTop: "1px dashed var(--surface-border)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Ganancia:
                    </span>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: profit >= 0 ? "#10B981" : "var(--danger)",
                      }}
                    >
                      {formatCLP(profit)} ({margin.toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {checklistId === basket.id ? (
                  <div
                    style={{
                      padding: "1.5rem",
                      background: "rgba(59, 130, 246, 0.1)",
                      borderTop: "1px solid var(--surface-border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          color: "#60a5fa",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <CheckSquare size={18} /> Checklist de Armado
                      </h4>
                      <button
                        onClick={() => toggleChecklist(basket.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {basket.items.map((item, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            padding: "0.75rem",
                            background: checkedItems[idx]
                              ? "rgba(16, 185, 129, 0.1)"
                              : "var(--panel-alt)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            border: checkedItems[idx]
                              ? "1px solid #10B981"
                              : "1px solid transparent",
                            transition: "all 0.2s",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checkedItems[idx] || false}
                            onChange={() => toggleCheck(idx)}
                            style={{
                              width: "20px",
                              height: "20px",
                              accentColor: "#10B981",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: checkedItems[idx] ? "normal" : "bold",
                              color: checkedItems[idx]
                                ? "var(--text-muted)"
                                : "var(--text-main)",
                              textDecoration: checkedItems[idx]
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {item.quantity}x {item.name}{" "}
                            <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                              ({item.unit})
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  showAllDetails && (
                    <div
                      style={{
                        padding: "1.5rem",
                        background: "var(--panel-alt-2)",
                        borderTop: "1px solid var(--surface-border)",
                      }}
                    >
                      <h4
                        style={{
                          marginBottom: "0.5rem",
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Contenido:
                      </h4>
                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          margin: 0,
                          fontSize: "0.85rem",
                        }}
                      >
                        {basket.items.map((item, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <span>
                              {item.quantity}x {item.name}{" "}
                              <span style={{ color: "var(--text-muted)" }}>
                                ({item.unit})
                              </span>
                            </span>
                            <span>
                              {formatCLP(
                                item.cost * parseQuantity(item.quantity),
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}

                <div
                  style={{
                    padding: "1rem",
                    background: "var(--panel-alt)",
                    borderTop: "1px solid var(--surface-border)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <button
                      className="glass-button secondary"
                      style={{
                        padding: "0.75rem",
                        fontSize: "0.9rem",
                        color: "#10B981",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                      onClick={() => sellBasket(basket)}
                      title="Registrar Venta de Canasta"
                    >
                      <TrendingUp size={16} /> Vender
                    </button>
                    <button
                      className="glass-button secondary"
                      style={{
                        padding: "0.75rem",
                        fontSize: "0.9rem",
                        color: "#60a5fa",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                      onClick={() => toggleChecklist(basket.id)}
                      title="Modo Armado"
                    >
                      <CheckCircle size={16} /> Armar
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      className="glass-button secondary"
                      style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                      onClick={() => setInfoBasket(basket)}
                      title="Detalles Financieros"
                    >
                      <Info size={16} />
                    </button>
                    <button
                      className="glass-button secondary"
                      style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                      onClick={() => startEdit(basket)}
                      title="Editar Canasta"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="glass-button secondary"
                      style={{
                        padding: "0.5rem",
                        fontSize: "0.85rem",
                        color: "var(--primary)",
                      }}
                      onClick={() => exportQuote(basket)}
                      title="Generar PDF para Cliente"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      className="glass-button secondary"
                      style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                      onClick={() => duplicateBasket(basket)}
                      title="Duplicar Canasta"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="glass-button secondary"
                      style={{
                        padding: "0.5rem",
                        color: "var(--danger)",
                        fontSize: "0.85rem",
                      }}
                      onClick={() => deleteBasket(basket.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {infoBasket && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid var(--surface-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <TrendingUp color="var(--primary)" /> Detalles Financieros
              </h2>
              <button
                onClick={() => setInfoBasket(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: "2rem" }}>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                {infoBasket.name}
              </h3>
              <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                Stock actual armado: {infoBasket.stock || 0} unidades
              </p>

              <div
                className="grid-cards"
                style={{
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <div
                  style={{
                    background: "var(--panel-alt)",
                    padding: "1.5rem",
                    borderRadius: "12px",
                    borderLeft: "4px solid var(--primary)",
                  }}
                >
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <DollarSign size={14} /> Por Canasta
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>Costo:</span>{" "}
                    <strong>{formatCLP(infoBasket.cost)}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>Venta:</span>{" "}
                    <strong>{formatCLP(infoBasket.sellPrice)}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px solid var(--surface-border)",
                      paddingTop: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span>Ganancia Neta:</span>{" "}
                    <strong
                      style={{
                        color:
                          infoBasket.sellPrice - infoBasket.cost >= 0
                            ? "#10B981"
                            : "var(--danger)",
                      }}
                    >
                      {formatCLP(infoBasket.sellPrice - infoBasket.cost)}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--panel-alt)",
                    padding: "1.5rem",
                    borderRadius: "12px",
                    borderLeft: "4px solid #f59e0b",
                  }}
                >
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <PieChart size={14} /> Rentabilidad
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "2.5rem",
                        margin: 0,
                        color:
                          (infoBasket.sellPrice > 0
                            ? ((infoBasket.sellPrice - infoBasket.cost) /
                                infoBasket.sellPrice) *
                              100
                            : 0) >= 30
                            ? "#10B981"
                            : (infoBasket.sellPrice > 0
                                  ? ((infoBasket.sellPrice - infoBasket.cost) /
                                      infoBasket.sellPrice) *
                                    100
                                  : 0) > 0
                              ? "#f59e0b"
                              : "var(--danger)",
                      }}
                    >
                      {(infoBasket.sellPrice > 0
                        ? ((infoBasket.sellPrice - infoBasket.cost) /
                            infoBasket.sellPrice) *
                          100
                        : 0
                      ).toFixed(1)}
                      %
                    </h3>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Margen Comercial
                    </p>
                  </div>
                </div>
              </div>

              <h4
                style={{
                  marginBottom: "1rem",
                  borderBottom: "1px solid var(--surface-border)",
                  paddingBottom: "0.5rem",
                }}
              >
                Proyección de Inventario Armado ({infoBasket.stock || 0}{" "}
                unidades)
              </h4>
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "1.5rem",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>
                    Capital Invertido en Armado:
                  </span>
                  <span>
                    {formatCLP(infoBasket.cost * (infoBasket.stock || 0))}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>
                    Ingreso Bruto Estimado:
                  </span>
                  <span>
                    {formatCLP(infoBasket.sellPrice * (infoBasket.stock || 0))}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    paddingTop: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>
                    Ganancia Neta Esperada:
                  </span>
                  <strong style={{ fontSize: "1.2rem", color: "#10B981" }}>
                    {formatCLP(
                      (infoBasket.sellPrice - infoBasket.cost) *
                        (infoBasket.stock || 0),
                    )}
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: "2rem", textAlign: "center" }}>
                <button
                  onClick={() => setInfoBasket(null)}
                  className="glass-button"
                  style={{ display: "inline-flex", padding: "0.75rem 2rem" }}
                >
                  Cerrar Detalles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Baskets;
