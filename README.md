# DrainGuard 🛡️🌧️

> **Core2Code 2K26 — Smart City & Urban Innovation Hackathon**  
> Organized by **IEEE SIT Student Branch** & **IEEE Computer Society**  
> *Deadline: 10:00 AM IST, October 25, 2026*

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-78%20Passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Docs](https://img.shields.io/badge/Documentation-Comprehensive%20System-6f42c1.svg)](./docs/README.md)

---

> 📖 **Comprehensive Technical Documentation & Academic Survey Available:**  
> Explore the full research papers, architectural rationale, risk formulas, and operational guides in the [**Documentation Hub (`docs/README.md`)**](./docs/README.md).
> - [Academic Literature Survey & Synthesis (`docs/LITERATURE_SURVEY.md`)](./docs/LITERATURE_SURVEY.md)
> - [Related Work & Systematic Gap Analysis (`docs/RELATED_WORK_AND_GAP_ANALYSIS.md`)](./docs/RELATED_WORK_AND_GAP_ANALYSIS.md)
> - [Mathematical Derivation of the Risk Engine (`docs/RISK_ENGINE.md`)](./docs/RISK_ENGINE.md)
> - [System Architecture & Sequence Models (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)
> - [Geospatial Data Catalog & Provenance (`docs/GEO_SPATIAL_DATA_CATALOG.md`)](./docs/GEO_SPATIAL_DATA_CATALOG.md)
> - [Architecture Decision Records (ADRs 001–006)](./docs/architecture-decisions/)
> - [End-to-End Requirements Traceability Matrix (`docs/REQUIREMENTS_TRACEABILITY.md`)](./docs/REQUIREMENTS_TRACEABILITY.md)
> - [Test Strategy & Verification Pyramid (`docs/TEST_STRATEGY_AND_QA.md`)](./docs/TEST_STRATEGY_AND_QA.md)
> - [Hackathon Demonstration & Pitch Guide (`docs/HACKATHON_DEMO_GUIDE.md`)](./docs/HACKATHON_DEMO_GUIDE.md)

---

## 📌 Problem & Pitch

In urban India during torrential monsoon showers, commuters find out an underpass or arterial road is inundated only when they are already stuck in bumper-to-bumper waterlogging. Meanwhile, municipal drainage and storm-water maintenance crews react sequentially to citizen phone complaints in the order received, rather than dispatching teams proactively to high-risk catchments before the rain peaks.

**DrainGuard** provides:
1. **Explainable Zone-Level Waterlogging Risk**: Street-by-street risk scoring (0–100) combining live Open-Meteo rainfall forecasts, elevation depression factors, historical waterlogging frequency, and citizen blockage reports.
2. **Citizen Drain Reporting with Vision AI**: Residents upload photos of blocked drains; Gemini Vision classifies the debris and severity with a zero-downtime deterministic fallback.
3. **Fastest vs. Safest Routing**: Evaluates OpenStreetMap/OSRM driving routes against live risk zones, recommending a safer detour whenever an alternative route bypasses higher-risk choke points.
4. **Municipal Prioritized Inspection Queue**: Ranks catchments by immediate clearance priority (`score DESC → open_reports DESC`), enabling proactive workforce dispatch and live report lifecycle management (`open` → `assigned` → `cleared`).

---

## 🗺️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser (Next.js App Router)"]
        UI_Citizen["Interactive Citizen Map (Leaflet)"]
        UI_Slider["Rainfall Simulation Slider (0-120 mm)"]
        UI_Report["Photo Upload & Vision Blockage Form"]
        UI_Routing["Fastest vs Safest Route Panel"]
        UI_Muni["Municipal Priority Queue (/municipal)"]
        UI_About["Methodology & Transparency (/about)"]
    end

    subgraph Server ["Next.js Route Handlers (Edge / Serverless Node.js)"]
        API_Zones["/api/zones (Risk Engine)"]
        API_Weather["/api/weather (Open-Meteo Proxy)"]
        API_Analyze["/api/analyze (Gemini Vision + Fallback)"]
        API_Reports["/api/reports & /api/reports/[id]"]
        API_Inspections["/api/inspections (Priority Ranking)"]
        API_Route["/api/route (OSRM Engine + Risk Overlay)"]
    end

    subgraph CoreEngine ["Pure TypeScript Core Logic"]
        RiskEngine["Pure Deterministic Risk Formula (src/lib/risk.ts)"]
        ReportStore["In-Memory Synchronized Store (src/lib/reports-store.ts)"]
        SeedFixtures["Tumakuru Demonstration Fixtures (10 Zones, 8 Reports)"]
    end

    subgraph External ["External Upstream Services"]
        OpenMeteo["Open-Meteo Weather API (Free / Live Forecast)"]
        GeminiVision["Google Gemini 1.5 Flash REST API (Optional Key)"]
        OSRM["OSRM Public Driving Router (OpenStreetMap)"]
    end

    UI_Citizen --> API_Zones
    UI_Slider --> API_Zones
    UI_Report --> API_Analyze
    UI_Report --> API_Reports
    UI_Routing --> API_Route
    UI_Muni --> API_Inspections
    UI_Muni --> API_Reports

    API_Weather --> OpenMeteo
    API_Analyze --> GeminiVision
    API_Route --> OSRM

    API_Zones --> RiskEngine
    API_Inspections --> RiskEngine
    API_Route --> RiskEngine

    RiskEngine --> SeedFixtures
    RiskEngine --> ReportStore
    API_Reports --> ReportStore
```

---

## 🧮 Explainable Risk Model

DrainGuard rejects uninterpretable "black box" flood models. Risk scores are completely deterministic, auditable, and mathematically calculated per `docs/05_RISK_ENGINE.md` and implemented in [`src/lib/risk.ts`](./src/lib/risk.ts):

$$\text{RawScore} = 100 \times (0.40 \times \text{rain} + 0.25 \times \text{blockage} + 0.20 \times \text{history} + 0.15 \times \text{elevation})$$

### Normalized Factors
- **$\text{rain}$**: $\min(\frac{\text{rain\_mm}}{60}, 1.0)$
- **$\text{blockage}$**: $\min(\frac{\sum (\text{report severity} \times \text{status weight})}{6}, 1.0)$
  - `open` report: weight **1.0**
  - `assigned` report: weight **0.5**
  - `cleared` report: weight **0.0** (zero weight)
- **$\text{history}$**: $\text{zone.history\_factor}$ (normalized $0.0 \dots 1.0$, past ponding frequency)
- **$\text{elevation}$**: $\text{zone.elevation\_factor}$ (normalized $0.0 \dots 1.0$, depression / low-lying severity)

### Rainfall Gating
Urban street flooding is physically governed by rainfall. If rainfall is below $5\text{ mm}$, the raw score is attenuated by $0.3$:
$$\text{FinalScore} = \begin{cases} \text{round}(\text{RawScore} \times 0.3) & \text{if } \text{rain\_mm} < 5 \\ \text{round}(\text{RawScore}) & \text{if } \text{rain\_mm} \ge 5 \end{cases}$$

### Risk Thresholds
- **Low (0–29)**: Normal drainage function.
- **Medium (30–59)**: Moderate ponding risk; caution advised for two-wheelers.
- **High (60–79)**: Significant water accumulation; avoid low-lying stretches.
- **Severe (80–100)**: Critical inundation risk; road closure and immediate municipal clearing recommended.

*Inspect the complete mathematical derivation, factor rank ordering, and explanations in [`src/lib/risk.ts`](./src/lib/risk.ts) and on the [`/about`](./src/app/about/page.tsx) page.*

---

## ✨ Features Implemented & Verified

- [x] **Interactive Citizen Map**: Leaflet map focused on Tumakuru, Karnataka, displaying 10 demonstration catchment zones with dynamic risk-colored polygons (Green / Yellow / Coral / Red) and real-time inspector tooltips.
- [x] **Live Rainfall Simulation**: Slider (0–120 mm) with real-time risk recalculation, live Open-Meteo forecast sync, and one-click reset to live forecast.
- [x] **Citizen Drain Photo Reports with Vision AI**: Residents upload photos of clogged drains. Google Gemini 1.5 Flash classifies debris type (`plastic`, `silt`, `debris`, `construction`, `none`, `unknown`), estimated severity (1–3), and actionable summary. If no API key is configured or the upstream request fails, an instant deterministic fallback triggers automatically.
- [x] **Fastest vs. Safest Routing**: Computes driving directions using OSRM, evaluates road-zone intersections with 30m buffering, and recommends a safer alternative whenever one exists that reduces transit risk.
- [x] **Municipal Operations Dashboard (`/municipal`)**: Operational view sorting zones deterministically (`score DESC → open_reports DESC → zone_id ASC`) with synchronized rainfall controls and direct report lifecycle status updates (`open` → `assigned` → `cleared`).
- [x] **Methodology & Transparency (`/about`)**: Full disclosure of formula weights, normalization curves, data limitations, and simulated boundaries.

---

## 💻 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript 5)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with official DrainGuard brand color tokens
- **Mapping**: [Leaflet 1.9](https://leafletjs.com/) & [React-Leaflet 4.2](https://react-leaflet.js.org/) with OpenStreetMap cartography
- **Spatial Analysis**: [@turf/turf 7.2](https://turfjs.org/) (point-in-polygon, buffer queries, line-zone intersections)
- **Validation**: [Zod 3.23](https://zod.dev/) for strict schema validation across all API endpoints
- **Testing**: [Vitest 2.1](https://vitest.dev/) with 40 unit and integration tests
- **External Integrations**:
  - Weather: Open-Meteo REST API (public, no key required)
  - Vision AI: Google Gemini 1.5 Flash REST API (server-side with deterministic fallback)
  - Routing: OSRM OpenStreetMap Public Router (with local fallback routing)

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js 18.18+ or Node.js 20+
- npm 9+

### 1. Clone & Install
```bash
git clone https://github.com/saugat2737/DrainGuard.git
cd DrainGuard
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(Optional)* Add your Gemini API key to `.env.local` to enable live Vision AI. If left blank, the built-in deterministic classification fallback operates automatically without crashing:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Test Suite & Build Verification
```bash
# Run unit & API integration tests (40 tests)
npm test

# Run ESLint check
npm run lint

# Run TypeScript typecheck
npm run typecheck

# Build for production
npm run build
```

---

## ⚖️ Honest Limitations & Disclosures

In accordance with hackathon integrity guidelines:
1. **Simulated Demonstration Fixtures**: The 10 catchment zones and 8 seed blockage reports in Tumakuru are demonstration fixtures created for Core2Code 2K26. They are realistic representations designed for testing and demonstration, but are not verified surveys certified by the Tumakuru City Corporation (TCC).
2. **Rule-Based Risk Model**: The risk score is an explainable weighted formula; it is not a calibrated hydrodynamic 2D flood simulation model.
3. **In-Memory Report Storage**: Citizen-submitted reports and status transitions are maintained in server memory (`src/lib/reports-store.ts`). On multi-region or serverless deployments (such as Vercel), in-memory states reset upon serverless container recycling and are not guaranteed to persist across isolated instances.
4. **Third-Party Upstream Dependencies**: Routing and live weather rely on public free tiers (OSRM & Open-Meteo) and gracefully fall back to local models if rate limits or network dropouts occur.

---

## 👥 Credits & Acknowledgments

- **Hackathon Organizers**: Core2Code 2K26, IEEE SIT Student Branch, and IEEE Computer Society.
- **Data & Cartography**: [OpenStreetMap](https://www.openstreetmap.org/) contributors, [CARTO](https://carto.com/) base tiles, [Open-Meteo](https://open-meteo.com/), and [Project OSRM](https://project-osrm.org/).
- **AI Vision**: Google Gemini 1.5 Flash API (optional integration with resilient mock fallback).
