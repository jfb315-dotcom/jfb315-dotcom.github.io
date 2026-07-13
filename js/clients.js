// ============================================================
// Clients + Opportunity Scanner
// ============================================================

const Clients = (() => {
  let clients = [];
  let editingId = null;

  async function load() {
    clients = await Storage.getClients();
    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById("clientTableBody");
    if (!tbody) return;

    if (clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8" style="color:var(--muted);">No clients yet</td></tr>`;
      return;
    }

    tbody.innerHTML = clients.map(c => `
      <tr>
        <td class="font-medium">${escapeHtml(c.name)}</td>
        <td>${c.rate.toFixed(2)}%</td>
        <td>${c.balance ? "$" + c.balance.toLocaleString() : "—"}</td>
        <td>${escapeHtml(c.type || "—")}</td>
        <td>${c.lastContact || "—"}</td>
        <td class="max-w-[140px] truncate" style="color:var(--muted);">${escapeHtml(c.notes || "")}</td>
        <td>
          <button onclick="Clients.edit('${c.id}')" class="text-xs mr-2" style="color:var(--accent);">Edit</button>
          <button onclick="Clients.remove('${c.id}')" class="text-xs negative">Del</button>
        </td>
      </tr>
    `).join("");
  }

  function showForm(edit = false) {
    document.getElementById("formTitle").textContent = edit ? "Edit Client" : "Add New Client";
    document.getElementById("clientForm").classList.remove("hidden");
  }

  function hideForm() {
    document.getElementById("clientForm").classList.add("hidden");
    editingId = null;
    ["cName", "cRate", "cBalance", "cLastContact", "cContact", "cNotes"].forEach(id => {
      document.getElementById(id).value = "";
    });
    document.getElementById("cType").value = "Conventional 30yr";
  }

  async function save() {
    const name = document.getElementById("cName").value.trim();
    const rate = parseFloat(document.getElementById("cRate").value);
    if (!name || isNaN(rate)) {
      alert("Name and Current Rate are required.");
      return;
    }

    const client = {
      id: editingId || Date.now().toString(),
      name,
      rate,
      balance: parseFloat(document.getElementById("cBalance").value) || 0,
      type: document.getElementById("cType").value,
      lastContact: document.getElementById("cLastContact").value || "",
      contact: document.getElementById("cContact").value || "",
      notes: document.getElementById("cNotes").value || ""
    };

    if (editingId) {
      const idx = clients.findIndex(c => c.id === editingId);
      if (idx >= 0) clients[idx] = client;
    } else {
      clients.push(client);
    }

    await Storage.saveClients(clients);
    hideForm();
    renderTable();
    runScan();
  }

  function edit(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    editingId = id;
    document.getElementById("cName").value = c.name;
    document.getElementById("cRate").value = c.rate;
    document.getElementById("cBalance").value = c.balance || "";
    document.getElementById("cType").value = c.type || "Conventional 30yr";
    document.getElementById("cLastContact").value = c.lastContact || "";
    document.getElementById("cContact").value = c.contact || "";
    document.getElementById("cNotes").value = c.notes || "";
    showForm(true);
  }

  async function remove(id) {
    if (!confirm("Delete this client?")) return;
    clients = clients.filter(c => c.id !== id);
    await Storage.saveClients(clients);
    renderTable();
    runScan();
  }

  // ---------- Opportunity Scanner ----------
  function calcPayment(balance, annualRate, years) {
    if (balance <= 0 || annualRate <= 0) return 0;
    const r = annualRate / 100 / 12;
    const n = years * 12;
    return balance * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }

  async function runScan() {
    const rules = await Storage.getRules();
    const todayRate = Market.getCurrentRates().rate30;

    document.getElementById("oppRateDisplay").textContent = todayRate.toFixed(2) + "%";
    document.getElementById("ruleMinDiff").value = rules.minDiff;
    document.getElementById("ruleHighDiff").value = rules.highDiff;
    document.getElementById("ruleHighSavings").value = rules.highSavings;
    document.getElementById("ruleTerm").value = rules.term;

    let opps = [];
    let totalSavings = 0;
    let highCount = 0;

    clients.forEach(c => {
      const diff = c.rate - todayRate;
      if (diff < rules.minDiff) return;

      const oldPmt = calcPayment(c.balance, c.rate, rules.term);
      const newPmt = calcPayment(c.balance, todayRate, rules.term);
      const monthlySave = Math.max(0, oldPmt - newPmt);
      totalSavings += monthlySave;

      const isHigh = diff >= rules.highDiff || monthlySave >= rules.highSavings;
      if (isHigh) highCount++;

      opps.push({
        ...c,
        diff,
        monthlySave,
        priority: isHigh ? "HIGH" : "MEDIUM"
      });
    });

    opps.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === "HIGH" ? -1 : 1;
      return b.monthlySave - a.monthlySave;
    });

    document.getElementById("statTotal").textContent = clients.length;
    document.getElementById("statOpps").textContent = opps.length;
    document.getElementById("statHigh").textContent = highCount;
    document.getElementById("statSavings").textContent = "$" + Math.round(totalSavings).toLocaleString();

    const tbody = document.getElementById("oppTableBody");
    if (opps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10" style="color:var(--muted);">No opportunities with current rules.<br><span class="text-xs">Add clients or lower the threshold in Rules.</span></td></tr>`;
      return;
    }

    tbody.innerHTML = opps.map(o => `
      <tr>
        <td>
          <span class="text-xs font-bold px-2 py-0.5 rounded"
            style="background:color-mix(in srgb,${o.priority === "HIGH" ? "var(--positive)" : "var(--warning)"} 22%,transparent);color:${o.priority === "HIGH" ? "var(--positive)" : "var(--warning)"};">
            ${o.priority}
          </span>
        </td>
        <td class="font-medium">${escapeHtml(o.name)}</td>
        <td>${o.rate.toFixed(2)}%</td>
        <td>${o.balance ? "$" + o.balance.toLocaleString() : "—"}</td>
        <td class="negative font-medium">+${o.diff.toFixed(2)}%</td>
        <td class="positive font-semibold">$${Math.round(o.monthlySave).toLocaleString()}</td>
        <td>${o.lastContact || "—"}</td>
        <td>
          <button onclick="Clients.draftEmail('${o.id}', ${o.diff.toFixed(2)}, ${Math.round(o.monthlySave)})"
                  class="text-xs font-medium" style="color:var(--accent);">Draft Email</button>
        </td>
      </tr>
    `).join("");
  }

  function draftEmail(clientId, diff, save) {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    const todayRate = Market.getCurrentRates().rate30.toFixed(2);
    const subject = encodeURIComponent("Quick rate check for you – possible savings");
    const body = encodeURIComponent(
`Hi ${c.name.split(" ")[0]},

Hope you're doing well. I was reviewing current market rates this morning and noticed that rates have moved enough that it might make sense to take another look at your mortgage.

Your current rate: ${c.rate.toFixed(2)}%
Today's market (approx): ${todayRate}%
Potential difference: ~${diff}%
Estimated monthly savings (rough): around $${save}

Would you like me to run some exact numbers for you? Happy to put together a no-obligation comparison.

Best regards,
John Bischof
Home Mortgage Solutions LLC`
    );
    window.open(`mailto:${c.contact || ""}?subject=${subject}&body=${body}`);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Expose for onclick handlers
  return {
    load,
    showForm,
    hideForm,
    save,
    edit,
    remove,
    runScan,
    draftEmail
  };
})();
