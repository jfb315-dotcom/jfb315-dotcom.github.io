// ============================================================
// Storage Layer - localStorage + optional Firestore hybrid
// ============================================================

const Storage = (() => {
  let db = null;
  let auth = null;
  let userId = null;
  let ready = false;

  // Safe localStorage wrapper
  const local = {
    get(key, fallback = null) {
      try {
        if (typeof localStorage === "undefined") return fallback;
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch (e) {
        console.warn("localStorage get blocked", e.message);
        return fallback;
      }
    },
    set(key, value) {
      try {
        if (typeof localStorage === "undefined") return false;
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn("localStorage set blocked", e.message);
        return false;
      }
    },
    remove(key) {
      try {
        if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      } catch (e) {}
    }
  };

  async function init() {
    if (!USE_FIREBASE || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_")) {
      console.log("Using localStorage only (Firebase not configured)");
      ready = true;
      return { mode: "local" };
    }

    try {
      // Load Firebase SDKs dynamically if not already present
      if (typeof firebase === "undefined") {
        await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
      }

      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();

      // Anonymous sign-in for personal use
      const cred = await auth.signInAnonymously();
      userId = cred.user.uid;
      console.log("Firebase ready, user:", userId);
      ready = true;
      return { mode: "firebase", userId };
    } catch (err) {
      console.error("Firebase init failed, falling back to localStorage", err);
      ready = true;
      return { mode: "local" };
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ---------- Snapshots (history) ----------
  async function getSnapshots() {
    if (db && userId) {
      try {
        const snap = await db.collection("users").doc(userId).collection("snapshots")
          .orderBy("date", "desc").limit(90).get();
        return snap.docs.map(d => d.data());
      } catch (e) {
        console.warn("Firestore getSnapshots failed", e);
      }
    }
    try {
      return JSON.parse(local.get("jbMarketHistory", "[]"));
    } catch {
      return [];
    }
  }

  async function saveSnapshot(snapshot) {
    // Always keep local copy
    let history = [];
    try { history = JSON.parse(local.get("jbMarketHistory", "[]")); } catch {}
    history = history.filter(h => h.date !== snapshot.date);
    history.unshift(snapshot);
    if (history.length > 90) history = history.slice(0, 90);
    local.set("jbMarketHistory", JSON.stringify(history));

    // Also write to Firestore if available
    if (db && userId) {
      try {
        await db.collection("users").doc(userId).collection("snapshots")
          .doc(snapshot.date).set(snapshot, { merge: true });
      } catch (e) {
        console.warn("Firestore saveSnapshot failed", e);
      }
    }
    return true;
  }

  async function clearSnapshots() {
    local.remove("jbMarketHistory");
    if (db && userId) {
      try {
        const snap = await db.collection("users").doc(userId).collection("snapshots").get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (e) {
        console.warn("Firestore clear failed", e);
      }
    }
  }

  // ---------- Clients ----------
  async function getClients() {
    if (db && userId) {
      try {
        const snap = await db.collection("users").doc(userId).collection("clients").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Firestore getClients failed", e);
      }
    }
    try {
      return JSON.parse(local.get("jbClients", "[]"));
    } catch {
      return [];
    }
  }

  async function saveClients(clients) {
    local.set("jbClients", JSON.stringify(clients));
    if (db && userId) {
      try {
        // Simple full replace for personal use
        const col = db.collection("users").doc(userId).collection("clients");
        const existing = await col.get();
        const batch = db.batch();
        existing.docs.forEach(d => batch.delete(d.ref));
        clients.forEach(c => {
          const ref = col.doc(c.id || undefined);
          batch.set(ref, c);
        });
        await batch.commit();
      } catch (e) {
        console.warn("Firestore saveClients failed", e);
      }
    }
  }

  // ---------- Rules & Settings ----------
  async function getRules() {
    if (db && userId) {
      try {
        const doc = await db.collection("users").doc(userId).collection("settings").doc("rules").get();
        if (doc.exists) return doc.data();
      } catch (e) {}
    }
    return {
      minDiff: parseFloat(local.get("jbRuleMinDiff", "0.75")),
      highDiff: parseFloat(local.get("jbRuleHighDiff", "1.25")),
      highSavings: parseFloat(local.get("jbRuleHighSavings", "200")),
      term: parseFloat(local.get("jbRuleTerm", "25"))
    };
  }

  async function saveRules(rules) {
    local.set("jbRuleMinDiff", rules.minDiff);
    local.set("jbRuleHighDiff", rules.highDiff);
    local.set("jbRuleHighSavings", rules.highSavings);
    local.set("jbRuleTerm", rules.term);
    if (db && userId) {
      try {
        await db.collection("users").doc(userId).collection("settings").doc("rules").set(rules);
      } catch (e) {}
    }
  }

  function getTheme() {
    return local.get("jbTheme", "dark");
  }

  function setTheme(name) {
    local.set("jbTheme", name);
  }

  return {
    init,
    getSnapshots,
    saveSnapshot,
    clearSnapshots,
    getClients,
    saveClients,
    getRules,
    saveRules,
    getTheme,
    setTheme,
    isReady: () => ready
  };
})();
