# DrainGuard — Quality Assurance & Integration Telemetry Guide

This document details the test architecture, service diagnostic models, credential requirements, and verification procedures for DrainGuard.

---

## 1. Test Suite Architecture

DrainGuard utilizes **Vitest 2.1.9** with 8 modular test suites:

| Test Suite | Purpose | Execution Mode | Network Boundary |
|---|---|---|---|
| `tests/sanity.test.ts` | Vitest environment and setup sanity | Deterministic | Pure local |
| `tests/risk.test.ts` | Mathematical verification of the 0–100 deterministic risk engine | Deterministic | Pure local |
| `tests/api-routes.test.ts` | Next.js API route handlers (/api/zones, /api/weather, /api/inspections) | Deterministic | Mocked upstream |
| `tests/routing.test.ts` | Route line buffering, 30m corridor calculations, and trade-off comparisons | Deterministic | Mocked upstream |
| `tests/routing-qa-audit.test.ts` | Regression tests for dynamic route parameters, simulation isolation, and hotspot extraction | Deterministic | Mocked upstream |
| `tests/service-status.test.ts` | Service status diagnostic endpoint (/api/status) and credential concealment | Deterministic | Mocked upstream |
| `tests/reports-vision.test.ts` | Multimodal photo analysis, fallback heuristics, and citizen report storage | Deterministic | Mocked upstream |
| `tests/live-smoke.test.ts` | Opt-in live smoke test against live Open-Meteo and OSRM endpoints | Opt-In Live | Real Network (5s timeout) |

---

## 2. Running Test Commands

### A. Run Deterministic Unit & Integration Test Suite
```bash
npm test
```
*Executes all 51 deterministic unit and integration tests in under 4 seconds without external network dependencies.*

### B. Typecheck & Linter
```bash
npm run typecheck
npm run lint
```

### C. Run Opt-In Live Smoke Tests
To run live network verification against real public endpoints:
```bash
# On Linux / macOS / Git Bash
RUN_LIVE_SMOKE=true npm test tests/live-smoke.test.ts

# On Windows PowerShell
$env:RUN_LIVE_SMOKE="true"; npx vitest run tests/live-smoke.test.ts; Remove-Item Env:\RUN_LIVE_SMOKE
```

---

## 3. Upstream Integrations & Credential Requirements

| Integration | Provider | Purpose | Status in Local Setup | Required Credentials |
|---|---|---|---|---|
| **Precipitation Forecast** | Open-Meteo REST API | Hourly precipitation & 3-hour forecasts | **Live Active** | None (Free public service) |
| **Routing Engine** | Project-OSRM Public Gateway | Geometric street routing & alternatives | **Live Active** | None (OpenStreetMap public gateway) |
| **Vision AI Classifier** | Google Gemini 1.5 Flash | Classifies debris & severity from photo | **Zero-Downtime Fallback** | `GEMINI_API_KEY` (Optional; runs deterministic heuristic if absent) |
| **Vehicular Traffic** | TomTom / HERE / Google | Live congestion and dynamic incident flow | **Not Connected** | `TOMTOM_API_KEY`, `HERE_API_KEY`, or `GOOGLE_MAPS_API_KEY` |
| **Risk Engine** | Pure TypeScript Logic | Deterministic 4-factor risk calculation | **Local Active** | None (Local execution) |
| **Civic Reports Store** | Synchronized Memory Store | Manages citizen reports & clearance backlog | **Local Active** | None (In-memory session storage) |

---

## 4. Diagnostic State Architecture (`/api/status`)

DrainGuard provides `/api/status`, which provides diagnostic transparency without leaking credentials or tokens:
- **`available`**: Upstream service reachable and returned fresh live telemetry.
- **`cached`**: Serving verified recent cached forecast data.
- **`local`**: Pure deterministic local computation.
- **`demo`**: Operating in offline demonstration mode (e.g. Gemini Vision heuristic fallback).
- **`degraded`**: Partial data availability or transient upstream failure with graceful fallback.
- **`unavailable`**: Unconnected external feature (e.g. Live vehicular traffic).
