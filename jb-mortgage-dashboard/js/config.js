// ============================================================
// JB Mortgage Dashboard - Configuration
// Edit these values for Firebase + FRED live data
// ============================================================

// ---------- Firebase (recommended) ----------
// 1. Go to https://console.firebase.google.com
// 2. Create / select project → Project Settings → Your apps → Web
// 3. Copy the firebaseConfig object below
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Set to true after you paste real Firebase config
const USE_FIREBASE = false;

// ---------- FRED API (free live indexes) ----------
// 1. Get free key: https://fred.stlouisfed.org/docs/api/api_key.html
// 2. Paste it below
const FRED_API_KEY = "YOUR_FRED_API_KEY_HERE";

// FRED series we use
const FRED_SERIES = {
  DGS10: "10-Year Treasury",          // Daily
  SOFR: "Secured Overnight Financing Rate",
  DFF: "Effective Federal Funds Rate",
  DPRIME: "Bank Prime Loan Rate"
};

// ---------- Defaults (used on first load) ----------
const DEFAULT_RATES = {
  rate30: 6.72,
  chg30: 0.08,
  rate15: 6.20,
  chg15: 0.01,
  jumbo: 6.85,
  chgJumbo: 0.03,
  arm: 6.22,
  chgARM: -0.01,
  fha: 6.24,
  chgFHA: 0.03,
  va: 6.26,
  chgVA: 0.03
};

const DEFAULT_INDEXES = {
  ust10: 4.58,
  sofr: 3.53,
  fedfunds: 3.62,
  prime: 6.75,
  cofi: 3.85,          // 11th District COFI (monthly, approximate)
  mbs50: "97-15",
  mbs55: "99-22"
};

// App version (shown in footer)
const APP_VERSION = "2026.07.13";
