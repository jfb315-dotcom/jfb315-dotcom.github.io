// ============================================================
// Charts - individual item trends + spread
// ============================================================

const Charts = (() => {
  let mainChart = null;
  let spreadChart = null;

  function getColors() {
    const s = getComputedStyle(document.documentElement);
    return {
      accent: s.getPropertyValue("--accent").trim() || "#06b6d4",
      muted: s.getPropertyValue("--muted").trim() || "#94a3b8",
      cardBorder: s.getPropertyValue("--card-border").trim() || "#334155"
    };
  }

  function renderMain(history) {
    const metric = document.getElementById("chartMetric")?.value || "rate30";
    const labels = history.map(h => h.date.slice(5)); // MM-DD
    let data = [];
    let label = "";

    switch (metric) {
      case "rate30": data = history.map(h => h.rate30); label = "30yr Fixed %"; break;
      case "rate15": data = history.map(h => h.rate15); label = "15yr Fixed %"; break;
      case "ust10": data = history.map(h => h.ust10); label = "10-Yr Treasury %"; break;
      case "spread": data = history.map(h => Math.round((h.spread || 0) * 100)); label = "Spread (bps)"; break;
      case "sofr": data = history.map(h => h.sofr); label = "SOFR %"; break;
      case "prime": data = history.map(h => h.prime); label = "Prime Rate %"; break;
      case "fedfunds": data = history.map(h => h.fedfunds); label = "Fed Funds %"; break;
      case "mbs50":
        data = history.map(h => {
          if (!h.mbs50) return null;
          const str = String(h.mbs50);
          if (str.includes("-")) {
            const [w, t] = str.split("-").map(Number);
            return w + (t || 0) / 32;
          }
          return parseFloat(str);
        });
        label = "UMBS 5.0 Price";
        break;
      default:
        data = history.map(h => h.rate30);
        label = "30yr Fixed %";
    }

    const colors = getColors();
    const ctx = document.getElementById("mainChart")?.getContext("2d");
    if (!ctx) return;

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: colors.accent,
          backgroundColor: colors.accent + "33",
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1e293b",
            titleColor: "#e2e8f0",
            bodyColor: "#cbd5e1"
          }
        },
        scales: {
          x: {
            ticks: { color: colors.muted, font: { size: 10 } },
            grid: { color: colors.cardBorder + "55" }
          },
          y: {
            ticks: { color: colors.muted, font: { size: 10 } },
            grid: { color: colors.cardBorder + "55" }
          }
        }
      }
    });
  }

  function renderSpread(history, currentSpreadBps) {
    const labels = history.length ? history.map(h => h.date.slice(5)) : ["Today"];
    const data = history.length
      ? history.map(h => Math.round((h.spread || 0) * 100))
      : [currentSpreadBps || 0];

    const colors = getColors();
    const ctx = document.getElementById("spreadChart")?.getContext("2d");
    if (!ctx) return;

    if (spreadChart) spreadChart.destroy();

    spreadChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Spread (bps)",
          data,
          backgroundColor: colors.accent + "99",
          borderColor: colors.accent,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1e293b",
            titleColor: "#e2e8f0",
            bodyColor: "#cbd5e1"
          }
        },
        scales: {
          x: {
            ticks: { color: colors.muted, font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: colors.muted, font: { size: 10 } },
            grid: { color: colors.cardBorder + "55" },
            title: {
              display: true,
              text: "Basis Points",
              color: colors.muted,
              font: { size: 11 }
            }
          }
        }
      }
    });
  }

  function destroy() {
    if (mainChart) mainChart.destroy();
    if (spreadChart) spreadChart.destroy();
    mainChart = null;
    spreadChart = null;
  }

  return { renderMain, renderSpread, destroy };
})();
