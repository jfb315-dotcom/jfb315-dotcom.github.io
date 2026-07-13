// ============================================================
// Main App - tabs, theme, init, snapshot save
// ============================================================

const App = (() => {
  let history = [];

  async function init() {
    // Theme
    const theme = Storage.getTheme();
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-btn").forEach(btn => {
      if (btn.dataset.theme === theme) btn.classList.add("active");
    });

    // Storage (local or Firebase)
    await Storage.init();

    // Load history
    history = await Storage.getSnapshots();
    const prev = history[0] || null;

    // Market
    Market.init(prev);

    // Clients
    await Clients.load();

    // Charts
    Charts.renderMain(history.slice().reverse());
    const spreadBps = Math.round((Market.getCurrentRates().rate30 - Market.getIndexes().ust10) * 100);
    Charts.renderSpread(history.slice().reverse(), spreadBps);

    // History table
    renderHistoryTable();

    // Rules form
    const rules = await Storage.getRules();
    document.getElementById("ruleMinDiff").value = rules.minDiff;
    document.getElementById("ruleHighDiff").value = rules.highDiff;
    document.getElementById("ruleHighSavings").value = rules.highSavings;
    document.getElementById("ruleTerm").value = rules.term;

    // Timestamp
    document.getElementById("dataTime").textContent = new Date().toLocaleString();

    // Bind events
    bindEvents();

    console.log("JB Mortgage Dashboard ready");
  }

  function bindEvents() {
    // Theme buttons
    document.querySelectorAll(".theme-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.theme;
        document.documentElement.setAttribute("data-theme", name);
        Storage.setTheme(name);
        document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        // re-render charts with new colors
        setTimeout(() => {
          Charts.renderMain(history.slice().reverse());
          const spreadBps = Math.round((Market.getCurrentRates().rate30 - Market.getIndexes().ust10) * 100);
          Charts.renderSpread(history.slice().reverse(), spreadBps);
        }, 50);
      });
    });

    // Tabs
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    // Index inputs
    ["ust10", "sofr", "fedfunds", "prime", "cofi", "mbs50", "mbs55"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => Market.updateFromInputs());
    });

    // MBS status + trend
    document.getElementById("mbsStatus")?.addEventListener("input", () => Market.updateAutoTrend());
    document.getElementById("trend")?.addEventListener("change", () => Market.updateAutoTrend());

    // Chart selector
    document.getElementById("chartMetric")?.addEventListener("change", () => {
      Charts.renderMain(history.slice().reverse());
    });
  }

  function switchTab(name) {
    ["market", "opportunities", "clients", "settings"].forEach(t => {
      document.getElementById("panel-" + t)?.classList.add("hidden");
      document.getElementById("tab-" + t)?.classList.remove("active");
    });
    document.getElementById("panel-" + name)?.classList.remove("hidden");
    document.getElementById("tab-" + name)?.classList.add("active");

    if (name === "opportunities") {
      Clients.runScan();
    }
    if (name === "clients") {
      Clients.load();
    }
  }

  async function saveSnapshot() {
    Market.updateFromInputs();
    const snapshot = Market.buildSnapshot();
    await Storage.saveSnapshot(snapshot);
    history = await Storage.getSnapshots();
    previous = history[0];

    document.getElementById("lastSaved").textContent = "Saved " + new Date().toLocaleTimeString();
    document.getElementById("lastSaved").classList.remove("hidden");

    renderHistoryTable();
    Charts.renderMain(history.slice().reverse());
    const spreadBps = Math.round((snapshot.spread || 0) * 100);
    Charts.renderSpread(history.slice().reverse(), spreadBps);

    Market.init(snapshot); // update previous for trend calc
    alert("Snapshot saved for " + snapshot.date);
  }

  async function clearHistory() {
    if (!confirm("Clear all history snapshots?")) return;
    await Storage.clearSnapshots();
    history = [];
    renderHistoryTable();
    Charts.renderMain([]);
    Charts.renderSpread([], 0);
  }

  function renderHistoryTable() {
    const tbody = document.getElementById("historyTableBody");
    const noHist = document.getElementById("noHistory");
    if (!tbody) return;

    if (history.length === 0) {
      tbody.innerHTML = "";
      noHist?.classList.remove("hidden");
      return;
    }
    noHist?.classList.add("hidden");

    tbody.innerHTML = history.map(h => `
      <tr>
        <td class="font-medium">${h.date}</td>
        <td>${h.rate30?.toFixed(2) || "—"}%</td>
        <td>${h.rate15?.toFixed(2) || "—"}%</td>
        <td>${h.ust10?.toFixed(2) || "—"}%</td>
        <td style="color:var(--accent);">${h.spread?.toFixed(2) || "—"}%</td>
        <td>${h.sofr?.toFixed(2) || "—"}%</td>
        <td>${h.mbs50 || "—"}</td>
        <td>
          <span class="text-xs font-semibold px-2 py-0.5 rounded"
            style="background:color-mix(in srgb,${h.trend === "POSITIVE" ? "var(--positive)" : h.trend === "NEGATIVE" ? "var(--negative)" : "var(--warning)"} 20%,transparent);color:${h.trend === "POSITIVE" ? "var(--positive)" : h.trend === "NEGATIVE" ? "var(--negative)" : "var(--warning)"};">
            ${h.trend || "—"}
          </span>
        </td>
      </tr>
    `).join("");
  }

  async function saveRules() {
    const rules = {
      minDiff: parseFloat(document.getElementById("ruleMinDiff").value) || 0.75,
      highDiff: parseFloat(document.getElementById("ruleHighDiff").value) || 1.25,
      highSavings: parseFloat(document.getElementById("ruleHighSavings").value) || 200,
      term: parseFloat(document.getElementById("ruleTerm").value) || 25
    };
    await Storage.saveRules(rules);
    alert("Rules saved.");
    Clients.runScan();
  }

  // Public
  return {
    init,
    switchTab,
    saveSnapshot,
    clearHistory,
    saveRules
  };
})();

// Boot
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
