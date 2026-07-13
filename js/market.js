// ============================================================
// Market Watch logic - rates, indexes, auto trend, FRED pull
// ============================================================

const Market = (() => {
  let currentRates = { ...DEFAULT_RATES };
  let indexes = { ...DEFAULT_INDEXES };
  let previousSnapshot = null;

  function init(prevSnap) {
    previousSnapshot = prevSnap || null;
    renderDisplayRates();
    renderIndexes();
    updateSpread();
    updateAutoTrend();
  }

  function renderDisplayRates() {
    document.getElementById("disp30").textContent = currentRates.rate30.toFixed(2) + "%";
    document.getElementById("disp15").textContent = currentRates.rate15.toFixed(2) + "%";
    document.getElementById("dispJumbo").textContent = currentRates.jumbo.toFixed(2) + "%";
    document.getElementById("dispARM").textContent = currentRates.arm.toFixed(2) + "%";
    document.getElementById("dispFHA").textContent = currentRates.fha.toFixed(2) + "%";
    document.getElementById("dispVA").textContent = currentRates.va.toFixed(2) + "%";

    setChange("chg30", currentRates.chg30);
    setChange("chg15", currentRates.chg15);
    setChange("chgJumbo", currentRates.chgJumbo);
    setChange("chgARM", currentRates.chgARM);
    setChange("chgFHA", currentRates.chgFHA);
    setChange("chgVA", currentRates.chgVA);
  }

  function setChange(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const sign = val >= 0 ? "+" : "";
    el.textContent = sign + val.toFixed(2);
    el.className = "change " + (val > 0 ? "negative" : val < 0 ? "positive" : "");
  }

  function renderIndexes() {
    document.getElementById("ust10").value = indexes.ust10;
    document.getElementById("sofr").value = indexes.sofr;
    document.getElementById("fedfunds").value = indexes.fedfunds;
    document.getElementById("prime").value = indexes.prime;
    document.getElementById("cofi").value = indexes.cofi;
    document.getElementById("mbs50").value = indexes.mbs50;
    document.getElementById("mbs55").value = indexes.mbs55;
  }

  function updateFromInputs() {
    indexes.ust10 = parseFloat(document.getElementById("ust10").value) || 0;
    indexes.sofr = parseFloat(document.getElementById("sofr").value) || 0;
    indexes.fedfunds = parseFloat(document.getElementById("fedfunds").value) || 0;
    indexes.prime = parseFloat(document.getElementById("prime").value) || 0;
    indexes.cofi = parseFloat(document.getElementById("cofi").value) || 0;
    indexes.mbs50 = document.getElementById("mbs50").value;
    indexes.mbs55 = document.getElementById("mbs55").value;
    updateSpread();
    updateAutoTrend();
  }

  function updateSpread() {
    const spread = currentRates.rate30 - indexes.ust10;
    document.getElementById("spreadValue").textContent = spread.toFixed(2) + "%";
    document.getElementById("spreadBps").textContent = Math.round(spread * 100) + " bps";
  }

  // Automatic trend based on MBS status text + rate movement vs previous snapshot
  function updateAutoTrend() {
    const mbsStatus = (document.getElementById("mbsStatus").value || "").toLowerCase();
    const textEl = document.getElementById("statusText");
    const dotEl = document.getElementById("statusDot");

    let trend = "MINIMAL";
    let reason = "Watch closely";

    const weaker = mbsStatus.includes("weak") || mbsStatus.includes("significantly") || mbsStatus.includes("down");
    const stronger = mbsStatus.includes("strong") || mbsStatus.includes("firmer") || mbsStatus.includes("better") || mbsStatus.includes("up");

    // Compare 30yr rate to previous snapshot if available
    let rateUp = false;
    let rateDown = false;
    if (previousSnapshot && previousSnapshot.rate30) {
      const diff = currentRates.rate30 - previousSnapshot.rate30;
      if (diff > 0.02) rateUp = true;
      if (diff < -0.02) rateDown = true;
    }

    if (weaker || rateUp) {
      trend = "NEGATIVE";
      reason = weaker ? "MBS weaker / Rates under pressure" : "Rates rising vs previous day";
    } else if (stronger || rateDown) {
      trend = "POSITIVE";
      reason = stronger ? "MBS firmer / Rates improving" : "Rates falling vs previous day";
    }

    // Allow manual override via select if user wants
    const manual = document.getElementById("trend").value;
    if (manual && manual !== "AUTO") {
      trend = manual;
    }

    document.getElementById("trend").value = trend === "MINIMAL" ? "MINIMAL" : trend;

    textEl.textContent = trend + " — " + reason;
    if (trend === "POSITIVE") {
      textEl.className = "font-bold text-lg positive";
      dotEl.style.background = "var(--positive)";
    } else if (trend === "NEGATIVE") {
      textEl.className = "font-bold text-lg negative";
      dotEl.style.background = "var(--negative)";
    } else {
      textEl.className = "font-bold text-lg";
      textEl.style.color = "var(--warning)";
      dotEl.style.background = "var(--warning)";
    }

    return trend;
  }

  // Pull free indexes from FRED
  async function refreshLiveIndexes() {
    if (!FRED_API_KEY || FRED_API_KEY.includes("YOUR_")) {
      alert("Please add your free FRED API key in js/config.js first.\nGet one at: https://fred.stlouisfed.org/docs/api/api_key.html");
      return;
    }

    const btn = document.getElementById("btnRefreshFred");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Fetching…";
    }

    try {
      // Fetch multiple series in parallel (most recent value)
      const series = ["DGS10", "SOFR", "DFF", "DPRIME"];
      const promises = series.map(s =>
        fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${s}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`)
          .then(r => r.json())
          .then(data => {
            const obs = data.observations?.[0];
            return { series: s, value: obs ? parseFloat(obs.value) : null, date: obs?.date };
          })
          .catch(() => ({ series: s, value: null }))
      );

      const results = await Promise.all(promises);
      let updated = 0;

      results.forEach(r => {
        if (r.value === null || isNaN(r.value)) return;
        if (r.series === "DGS10") { indexes.ust10 = r.value; updated++; }
        if (r.series === "SOFR") { indexes.sofr = r.value; updated++; }
        if (r.series === "DFF") { indexes.fedfunds = r.value; updated++; }
        if (r.series === "DPRIME") { indexes.prime = r.value; updated++; }
      });

      renderIndexes();
      updateSpread();
      updateAutoTrend();

      if (updated > 0) {
        alert(`Updated ${updated} live indexes from FRED.\n(MBS and daily mortgage rates still come from MND)`);
      } else {
        alert("Could not fetch data. Check your FRED API key or network.");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching FRED data. See console for details.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Refresh Live Indexes (FRED)";
      }
    }
  }

  function buildSnapshot() {
    const trend = document.getElementById("trend").value || "MINIMAL";
    return {
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString(),
      rate30: currentRates.rate30,
      rate15: currentRates.rate15,
      jumbo: currentRates.jumbo,
      arm: currentRates.arm,
      fha: currentRates.fha,
      va: currentRates.va,
      ust10: indexes.ust10,
      sofr: indexes.sofr,
      fedfunds: indexes.fedfunds,
      prime: indexes.prime,
      cofi: indexes.cofi,
      mbs50: indexes.mbs50,
      mbs55: indexes.mbs55,
      mbsStatus: document.getElementById("mbsStatus").value,
      trend,
      notes: document.getElementById("notes").value,
      spread: currentRates.rate30 - indexes.ust10
    };
  }

  function getCurrentRates() {
    return currentRates;
  }

  function getIndexes() {
    return indexes;
  }

  // Allow manual override of the big display rates if needed later
  function setDisplayRate(key, value, change = 0) {
    if (currentRates.hasOwnProperty(key)) {
      currentRates[key] = value;
      if (key.startsWith("chg")) currentRates[key] = change;
      renderDisplayRates();
      updateSpread();
    }
  }

  return {
    init,
    updateFromInputs,
    updateAutoTrend,
    refreshLiveIndexes,
    buildSnapshot,
    getCurrentRates,
    getIndexes,
    setDisplayRate,
    updateSpread
  };
})();
