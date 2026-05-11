import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Activity,
  PieChart,
  Target,
  Zap,
  ShoppingBag,
  Download,
  FileText,
} from "lucide-react";
import { formatCLP } from "../utils/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Finances = ({ products, baskets, sales = [] }) => {
  const [projectedSales, setProjectedSales] = useState(10);

  // Inventario Valorizado (basado en el Stock de canastas y productos)
  const capitalInvertido =
    baskets.reduce((acc, b) => acc + b.cost * (b.stock || 0), 0) +
    products.reduce((acc, p) => acc + p.cost * (p.stock || 0), 0);

  const valorVentaInventario =
    baskets.reduce((acc, b) => acc + b.sellPrice * (b.stock || 0), 0) +
    products.reduce((acc, p) => acc + p.sellPrice * (p.stock || 0), 0);

  const gananciaProyectadaInventario = valorVentaInventario - capitalInvertido;

  // Catálogo Promedio (sin importar el stock)
  const allCatalogItems = [...baskets, ...products];
  const avgCost =
    allCatalogItems.length > 0
      ? allCatalogItems.reduce((acc, item) => acc + item.cost, 0) /
        allCatalogItems.length
      : 0;
  const avgSellPrice =
    allCatalogItems.length > 0
      ? allCatalogItems.reduce((acc, item) => acc + item.sellPrice, 0) /
        allCatalogItems.length
      : 0;
  const avgProfit = avgSellPrice - avgCost;
  const avgMargin = avgSellPrice > 0 ? (avgProfit / avgSellPrice) * 100 : 0;

  // Proyección de ventas basada en el promedio
  const projectedRevenue = projectedSales * avgSellPrice;
  const projectedCost = projectedSales * avgCost;
  const projectedNetProfit = projectedRevenue - projectedCost;

  // Ventas Reales Históricas
  const totalSalesRevenue = sales.reduce(
    (acc, s) => acc + (Number(s.revenue) || 0),
    0,
  );
  const totalSalesProfit = sales.reduce(
    (acc, s) => acc + (Number(s.profit) || 0),
    0,
  );

  // Análisis de Datos Duros
  const itemSales = {};
  sales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const id = `${item.type}-${item.id}`;
      if (!itemSales[id]) {
        itemSales[id] = {
          name: item.name,
          type: item.type,
          quantity: 0,
          revenue: 0,
          category: item.category,
        };
      }
      itemSales[id].quantity += item.quantity;
      itemSales[id].revenue += item.sellPrice * item.quantity;
    });
  });

  const topItems = Object.values(itemSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const categorySales = {};
  Object.values(itemSales).forEach((item) => {
    const cat = item.category || "Sin Categoría";
    categorySales[cat] = (categorySales[cat] || 0) + item.revenue;
  });
  const topCategory = Object.entries(categorySales).sort(
    (a, b) => b[1] - a[1],
  )[0] || ["N/A", 0];

  const last12MonthsData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    // Last 6 months for compact display
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    last12MonthsData.push({
      month: monthStr,
      revenue: 0,
      profit: 0,
      label: d.toLocaleDateString("es-CL", { month: "short", year: "numeric" }),
    });
  }

  sales.forEach((s) => {
    const d = new Date(s.date);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const targetMonth = last12MonthsData.find((m) => m.month === monthStr);
    if (targetMonth) {
      targetMonth.revenue += Number(s.revenue) || 0;
      targetMonth.profit += Number(s.profit) || 0;
    }
  });

  const exportFinancialReport = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const today = new Date().toLocaleDateString("es-CL");
      const time = new Date().toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Header
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text("INFORME COMERCIAL Y FINANCIERO", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `EspeMarket Business Suite | Fecha de emisión: ${today} a las ${time}`,
        14,
        28,
      );

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(14, 32, 196, 32);

      let finalY = 40;

      // 1. RESUMEN DE VENTAS
      doc.setFontSize(14);
      doc.setTextColor(55, 65, 81);
      doc.text("1. RESUMEN DE VENTAS (HISTÓRICO)", 14, finalY);

      const realMargin =
        totalSalesRevenue > 0
          ? ((totalSalesProfit / totalSalesRevenue) * 100).toFixed(1)
          : 0;
      autoTable(doc, {
        startY: finalY + 5,
        theme: "grid",
        headStyles: {
          fillColor: [249, 250, 251],
          textColor: [17, 24, 39],
          fontStyle: "bold",
        },
        body: [
          ["Total Ingresos Brutos", formatCLP(totalSalesRevenue)],
          ["Ganancia Neta Real (Bolsillo)", formatCLP(totalSalesProfit)],
          ["Margen de Ganancia Real", `${realMargin}%`],
          ["Total Transacciones", `${sales.length} ventas`],
        ],
        didParseCell: function (data) {
          if (data.row.index === 1 && data.column.index === 1) {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      finalY = doc.lastAutoTable.finalY + 15;

      // 2. ESTADO DEL INVENTARIO
      doc.setFontSize(14);
      doc.setTextColor(55, 65, 81);
      doc.text("2. ESTADO DEL INVENTARIO ACTUAL", 14, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        theme: "grid",
        headStyles: {
          fillColor: [249, 250, 251],
          textColor: [17, 24, 39],
          fontStyle: "bold",
        },
        body: [
          ["Capital Invertido (Costo Stock)", formatCLP(capitalInvertido)],
          ["Valor de Venta Total (Stock)", formatCLP(valorVentaInventario)],
          ["Ganancia Neta Latente", formatCLP(gananciaProyectadaInventario)],
        ],
        didParseCell: function (data) {
          if (data.row.index === 2 && data.column.index === 1) {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      finalY = doc.lastAutoTable.finalY + 15;

      // 3. RENTABILIDAD PROMEDIO
      doc.setFontSize(14);
      doc.setTextColor(55, 65, 81);
      doc.text("3. RENTABILIDAD PROMEDIO DEL CATÁLOGO", 14, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        theme: "grid",
        headStyles: {
          fillColor: [249, 250, 251],
          textColor: [17, 24, 39],
          fontStyle: "bold",
        },
        body: [
          ["Costo Promedio por Artículo", formatCLP(avgCost)],
          ["Precio Venta Promedio", formatCLP(avgSellPrice)],
          ["Ganancia Promedio Unitaria", formatCLP(avgProfit)],
          ["Margen Promedio", `${avgMargin.toFixed(1)}%`],
        ],
        didParseCell: function (data) {
          if (data.row.index === 2 && data.column.index === 1) {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      finalY = doc.lastAutoTable.finalY + 15;

      // Check page break
      if (finalY > 230) {
        doc.addPage();
        finalY = 20;
      }

      // 4. RENDIMIENTO
      doc.setFontSize(14);
      doc.setTextColor(55, 65, 81);
      doc.text("4. RENDIMIENTO Y MÁS VENDIDOS", 14, finalY);

      finalY += 8;
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(
        `Categoría Estrella: ${topCategory[0]} - ${formatCLP(topCategory[1])}`,
        14,
        finalY,
      );

      finalY += 5;
      autoTable(doc, {
        startY: finalY,
        theme: "grid",
        head: [["Producto/Canasta", "Unidades", "Ingreso Total"]],
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          fontStyle: "bold",
        },
        body: topItems.map((item) => [
          item.name,
          item.quantity,
          formatCLP(item.revenue),
        ]),
      });
      finalY = doc.lastAutoTable.finalY + 15;

      if (finalY > 230) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(11);
      doc.text("Rendimiento Últimos 6 Meses", 14, finalY);

      const headRow = ["Métrica", ...last12MonthsData.map((m) => m.label)];
      const revRow = [
        "Ingreso Bruto",
        ...last12MonthsData.map((m) => formatCLP(m.revenue)),
      ];
      const profRow = [
        "Ganancia Neta",
        ...last12MonthsData.map((m) => formatCLP(m.profit)),
      ];
      const margRow = [
        "Margen (%)",
        ...last12MonthsData.map((m) => {
          return (
            (m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : 0) +
            "%"
          );
        }),
      ];

      autoTable(doc, {
        startY: finalY + 5,
        theme: "grid",
        head: [headRow],
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          fontStyle: "bold",
          halign: "center",
        },
        body: [revRow, profRow, margRow],
        didParseCell: function (data) {
          if (data.row.index === 1 && data.column.index > 0) {
            const rawVal = last12MonthsData[data.column.index - 1].profit;
            if (rawVal > 0) {
              data.cell.styles.textColor = [16, 185, 129];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175);
        doc.text(
          "Documento generado automáticamente por EspeMarket Cloud Sync.",
          105,
          290,
          { align: "center" },
        );
      }

      doc.save(`Informe_Comercial_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      alert("Hubo un error al generar el informe ejecutivo.");
    }
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
        <h1>Centro de Comando Financiero</h1>
        <button
          className="glass-button"
          onClick={exportFinancialReport}
          style={{ background: "var(--primary)", color: "white" }}
        >
          <FileText size={18} /> Generar PDF Comercial
        </button>
      </div>

      <h2
        style={{
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "#10B981",
        }}
      >
        <ShoppingBag size={24} /> Ventas Reales (Histórico)
      </h2>
      <div
        className="glass-panel"
        style={{
          padding: "2rem",
          marginBottom: "2.5rem",
          border: "1px solid rgba(16, 185, 129, 0.3)",
        }}
      >
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Este panel refleja el dinero real que ha entrado a tu negocio basado
          en todas las ventas realizadas (Canastas y Punto de Venta).
        </p>
        <div
          className="grid-cards"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          }}
        >
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              padding: "1.5rem",
              borderRadius: "12px",
              borderLeft: "4px solid #10B981",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              Ingreso Bruto (Ventas)
            </p>
            <h3 style={{ fontSize: "2.2rem", color: "var(--text-main)" }}>
              {formatCLP(totalSalesRevenue)}
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginTop: "0.5rem",
              }}
            >
              {sales.length} transacciones de venta
            </p>
          </div>
          <div
            style={{
              background: "rgba(16, 185, 129, 0.2)",
              padding: "1.5rem",
              borderRadius: "12px",
              borderLeft: "4px solid #34d399",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              Ganancia Neta Real (Bolsillo)
            </p>
            <h3 style={{ fontSize: "2.2rem", color: "#10B981" }}>
              {formatCLP(totalSalesProfit)}
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginTop: "0.5rem",
              }}
            >
              Margen real:{" "}
              {totalSalesRevenue > 0
                ? ((totalSalesProfit / totalSalesRevenue) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      <h2
        style={{
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Activity size={24} color="var(--primary)" /> Estado Actual (Stock de
        Inventario)
      </h2>
      <div
        className="glass-panel"
        style={{ padding: "2rem", marginBottom: "2.5rem" }}
      >
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Este panel refleja el valor de TODO tu inventario físico (productos
          sueltos y canastas armadas).
        </p>
        <div
          className="grid-cards"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          }}
        >
          <div
            style={{
              background: "var(--panel-alt)",
              padding: "1.5rem",
              borderRadius: "12px",
              borderLeft: "4px solid var(--text-muted)",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              Capital Invertido (Costo)
            </p>
            <h3 style={{ fontSize: "1.8rem" }}>
              {formatCLP(capitalInvertido)}
            </h3>
          </div>
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
              }}
            >
              Valor de Venta Total
            </p>
            <h3 style={{ fontSize: "1.8rem", color: "var(--text-main)" }}>
              {formatCLP(valorVentaInventario)}
            </h3>
          </div>
          <div
            style={{
              background: "var(--panel-alt)",
              padding: "1.5rem",
              borderRadius: "12px",
              borderLeft: "4px solid #10B981",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              Ganancia Neta Esperada
            </p>
            <h3
              style={{
                fontSize: "1.8rem",
                color:
                  gananciaProyectadaInventario >= 0
                    ? "#10B981"
                    : "var(--danger)",
              }}
            >
              {formatCLP(gananciaProyectadaInventario)}
            </h3>
          </div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}
      >
        {/* Promedios del Catálogo */}
        <div>
          <h2
            style={{
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <PieChart size={24} color="var(--secondary)" /> Rentabilidad
            Promedio
          </h2>
          <div
            className="glass-panel"
            style={{ padding: "2rem", height: "100%" }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Promedio calculado usando TODO tu catálogo (productos sueltos y
              modelos de canastas).
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--surface-border)",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Costo Promedio p/Artículo:
                </span>
                <span style={{ fontWeight: "bold" }}>{formatCLP(avgCost)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--surface-border)",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Precio Venta Promedio:
                </span>
                <span style={{ fontWeight: "bold" }}>
                  {formatCLP(avgSellPrice)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--surface-border)",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Ganancia Promedio:
                </span>
                <span style={{ fontWeight: "bold", color: "#10B981" }}>
                  {formatCLP(avgProfit)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Margen Comercial Promedio:
                </span>
                <span className={`badge ${avgMargin > 30 ? "success" : ""}`}>
                  {avgMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Simulador de Proyecciones */}
        <div>
          <h2
            style={{
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Target size={24} color="#f59e0b" /> Simulador de Ventas
          </h2>
          <div
            className="glass-panel"
            style={{ padding: "2rem", height: "100%" }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Simula tus ingresos basados en la rentabilidad promedio de tu
              catálogo.
            </p>

            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                Si lograras vender esta cantidad de artículos mixtos:
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <input
                  type="number"
                  className="glass-input"
                  style={{
                    fontSize: "1.5rem",
                    width: "120px",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                  value={projectedSales}
                  onChange={(e) =>
                    setProjectedSales(parseInt(e.target.value) || 0)
                  }
                  min="0"
                />
                <span style={{ color: "var(--text-muted)" }}>unidades</span>
              </div>
            </div>

            <div
              style={{
                background: "rgba(245, 158, 11, 0.1)",
                padding: "1.5rem",
                borderRadius: "12px",
                border: "1px solid rgba(245, 158, 11, 0.3)",
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
                  Ingreso Bruto (Ventas):
                </span>
                <span style={{ fontWeight: "bold" }}>
                  {formatCLP(projectedRevenue)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px dashed rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Costos Operativos:
                </span>
                <span style={{ fontWeight: "bold", color: "var(--danger)" }}>
                  - {formatCLP(projectedCost)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  Utilidad Libre (Ganancia):
                </span>
                <span
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: "bold",
                    color: "#10B981",
                  }}
                >
                  {formatCLP(projectedNetProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finances;
