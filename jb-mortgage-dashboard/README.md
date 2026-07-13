# JB Mortgage Market Dashboard

**Personal Rate & Market Opportunity Scanner** for John Bischof / Home Mortgage Solutions LLC.

A clean, modern, private dashboard for:
- Daily mortgage rates (display style like Mortgage News Daily)
- Major indexes (10yr Treasury, SOFR, Fed Funds, Prime, COFI)
- MBS prices (UMBS 5.0 / 5.5)
- Automatic market trend status
- History snapshots + individual trend charts (last 90 days)
- Client list + Opportunity Scanner (refi / rate drop matching)
- Personal notes, color themes (Dark / Coastal / Midnight / Light)

All data stays private (localStorage or your own Firebase).

---

## Quick Start (Local)

1. Download this folder or clone the repo.
2. Open `index.html` in Chrome or Edge (double-click).
3. Everything works immediately with localStorage.

---

## Recommended: GitHub + GitHub Pages

1. Create a new **private** GitHub repo named `jb-mortgage-dashboard` (or any name).
2. Upload / push all files in this folder to the root of the repo.
3. Go to **Settings → Pages**.
4. Source: Deploy from branch `main` / root.
5. Your dashboard will be live at:  
   `https://YOUR_USERNAME.github.io/jb-mortgage-dashboard/`

You can now open the URL on any device.

---

## Firebase Setup (Recommended for Sync + Better History)

You already have Firebase experience from the tournament app.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing) → name it something like `jb-mortgage-dashboard`.
3. Enable **Firestore Database** (start in production mode, then set rules).
4. Enable **Authentication** → Anonymous (or Email if you prefer).
5. Go to Project Settings → Your apps → Web → Register app → copy the `firebaseConfig`.
6. Paste the config into `js/config.js`.
7. (Optional) Enable Firebase Hosting later for even cleaner URL.

### Firestore Security Rules (important)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;   // or true for pure personal single-user
    }
  }
}
```

For pure personal use you can temporarily use `allow read, write: if true;` then lock it down.

### Collections used
- `snapshots` — your daily history
- `clients` — client list for Opportunity Scanner
- `settings` — theme, rules, last known rates

---

## Live Indexes (Free FRED API)

1. Go to https://fred.stlouisfed.org/docs/api/api_key.html
2. Request a free API key (instant).
3. Paste the key into `js/config.js` → `FRED_API_KEY`.
4. Click the **Refresh Live Indexes** button in the dashboard.
5. It will auto-fill:
   - 10-Year Treasury (DGS10)
   - SOFR
   - Fed Funds Effective (DFF)
   - Prime Rate (DPRIME)

**Note:** Daily mortgage rates (30yr etc.) and MBS prices still come from Mortgage News Daily (manual entry or open the link). True free live MBS is not reliably available.

---

## Features Overview

### Market Watch
- Display-only rate cards styled after MND (30yr, 15yr, Jumbo, ARM, FHA, VA)
- Editable / live Indexes + MBS
- Auto-calculated Spread
- Automatic Rate Trend (POSITIVE / MINIMAL / NEGATIVE) based on MBS status + rate movement vs previous snapshot
- Personal notes
- Live source links
- Save Snapshot → builds your private history

### Charts
- Individual item selector (30yr, 15yr, 10yr, SOFR, Spread, Prime, MBS, etc.)
- Last 90 days from your snapshots
- Spread bar chart

### Opportunity Scanner
- Add clients with current rate + balance
- Configurable rules (min rate difference, high-priority thresholds)
- Instant scan → prioritized list + estimated monthly savings
- One-click Draft Email

### Clients & Rules
- Full CRUD for personal client list
- Matching rules stored in Firebase / localStorage

---

## Color Themes
Click the 4 dots in the top right:
- Dark Pro (default)
- Coastal (navy + sky)
- Midnight (black + purple)
- Light

---

## Updating the App

Because it’s on GitHub:
1. Edit files locally or in GitHub web editor.
2. Commit + push.
3. GitHub Pages updates automatically (1–2 minutes).

Or keep using the single `index.html` for ultra-simple testing.

---

## Files Structure

```
jb-mortgage-dashboard/
├── index.html              ← Main page
├── css/
│   └── dashboard.css       ← All styles + themes
├── js/
│   ├── config.js           ← Firebase + FRED keys (edit this)
│   ├── storage.js          ← localStorage + Firestore hybrid
│   ├── market.js           ← Rates, indexes, trend logic
│   ├── charts.js           ← Chart.js helpers
│   ├── clients.js          ← Client list + Opportunity Scanner
│   └── app.js              ← Init, tabs, theme switcher
├── README.md               ← This file
└── public/                 ← (optional assets)
```

---

## Support / Next Ideas
- Firebase Cloud Function scheduled pull of FRED data every morning
- Export snapshots / clients to CSV
- PWA install prompt
- More MBS coupons or yield curve chart

Just tell me what you want next and I’ll give you complete updated files.

Built for John Bischof — Home Mortgage Solutions LLC  
Private tool • Eyes only
