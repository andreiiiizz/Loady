# ⚡ LoadWise - Philippine Prepaid Burn-Rate & Coverage PWA

LoadWise is a lightweight, mobile-first Progressive Web Application (PWA) tailored specifically for Philippine prepaid mobile users. It solves prepaid data anxiety through real-time burn-rate calculations, precise depletion forecasting, on-device automatic telco SMS parsing, and crowd-sourced route coverage mapping.

---

## 📱 Features

1. **Precision Burn-Rate Forecaster**:
   - Live countdown ticker (e.g. *"4d 8h left"* or *"Critical: 5h left"*).
   - Depletion timestamp predictor (e.g. *"Runs out Thursday at 4:15 PM"*).
   - Live velocity metrics in **MB/hr** and **GB/day**.
   - Proactive 24h & 6h warning banners.

2. **Zero-Effort Automatic Balance Tracking**:
   - **Background Time Decay Engine**: Automatically decays data usage based on your selected profile (*Light*, *Moderate*, *Heavy*, *Streamer*) without requiring mandatory manual entry.
   - **On-Device Telco SMS Auto-Parser**: 1-click clipboard paste detects and parses standard balance SMS from **Globe (8080)**, **Smart (9999)**, **DITO (185)**, **TM**, **TNT**, and **GOMO**.
   - **USSD Quick Dialers**: 1-tap dialer shortcodes for `*143#`, `*123#`, and `*185#`.
   - **Live Network Telemetry**: Reads connection type (4G/5G) and downlink throughput via `navigator.connection`.

3. **Curated 2026 Philippine Promo Catalog & Smart Switcher**:
   - 40+ pre-seeded promos across **Globe**, **Smart**, **DITO**, **TM**, **TNT**, and **GOMO**.
   - Filter by budget, validity, no-expiry, or unlimited data.
   - **Smart Switch Optimizer**: Recommends the highest peso-to-GB value promo tailored to your measured burn rate.

4. **Crowd-Sourced Barangay Coverage Map**:
   - Interactive **Leaflet + OpenStreetMap** map with carrier color-coded pins.
   - 1-tap signal strength report with GPS auto-fill and gamified contributor badges (*Barangay Scout*, *Signal Hunter*).
   - Confetti rewards on submission!

5. **Trip Mode (V1 Differentiator)**:
   - Route analyzer for major Philippine corridors (*Manila to Baguio via TPLEX*, *Cebu City to Moalboal*, *Manila to Tagaytay*, *EDSA Busway Carousel*).
   - Checkpoint-by-checkpoint signal strength breakdown and deadzone warnings.

6. **Multi-SIM Management & Offline-First**:
   - Dual-SIM support with instant carrier switching.
   - LocalStorage persistence with full offline support.
   - Pre-configured Supabase PostgreSQL schema (`supabase/schema.sql`) with PostGIS geospatial indexing.

---

## 🚀 Getting Started

### 1. Run Locally
```bash
npm install
npm run dev
```

### 2. Build for Production (PWA)
```bash
npm run build
npm run preview
```

### 3. Connect to Supabase (Optional Backend)
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run `supabase/schema.sql`.
3. Add your Supabase URL and Anon Key to `.env`.
