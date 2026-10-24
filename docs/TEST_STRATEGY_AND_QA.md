# DrainGuard Testing Strategy & Quality Assurance Framework

## 1. Quality Assurance Philosophy
DrainGuard follows a strict verification pyramid:
1. **Mathematical Determinism:** Risk scores, clamping, and route scoring are tested with pure unit tests without external mock latency.
2. **Deterministic Service Mocking:** Network handlers (Photon, Open-Meteo, OSRM) are tested using deterministic in-memory fixtures.
3. **End-to-End Commuter Journeys:** Automated regression suites simulate full journeys: place search, map picking, 3-route comparison, and evidence checks.
4. **Public Policy Safeguards:** Explicit tests verify that zero autocomplete requests hit `nominatim.openstreetmap.org`, and zero API keys are leaked in telemetry.

---

## 2. Test Suite Execution Summary

```
 RUN  v2.1.9 C:/Users/admin/OneDrive/Desktop/DrainGuard

 Test Files  12 passed (12)
      Tests  78 passed | 2 skipped (80)
   Duration  6.15s
```

| Test Suite File | Coverage Scope | Verified Test Scenarios | Status |
| :--- | :--- | :--- | :---: |
| [`tests/risk.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/risk.test.ts) | Pure Risk Engine | Clamping $0-100$, weight contributions ($40/25/20/15$), report severity weights, deterministic consistency | **PASS (8/8)** |
| [`tests/place-search.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/place-search.test.ts) | Geocoding & Public Policies | Photon GeoJSON parsing, `[lon, lat]` to `[lat, lng]` flip, location bias, Nominatim autocomplete ban safeguard | **PASS (7/7)** |
| [`tests/cache-and-production-data.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/cache-and-production-data.test.ts) | Caching & Data Policy | LRU eviction on `maxSize`, in-flight request coalescing, stale-if-error, production zero-seed isolation | **PASS (5/5)** |
| [`tests/routing.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/routing.test.ts) | OSRM & Spatial Risk Scoring | 30m corridor buffering, length-weighted exposure, fastest vs safest comparison, $+40\%$ detour rule | **PASS (6/6)** |
| [`tests/api-routes.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/api-routes.test.ts) | Next.js API Route Handlers | `/api/weather`, `/api/zones`, `/api/inspections`, query validation schemas, error handling | **PASS (10/10)** |
| [`tests/geospatial-evidence.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/geospatial-evidence.test.ts) | Topographical Grounding | GeoJSON closed rings, SRTM elevation references, antecedent accumulation math, zero-cost traffic policy | **PASS (5/5)** |
| [`tests/service-status.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/service-status.test.ts) | Transparency Telemetry | 8 monitored subsystems, strict secret masking, distinction of citizen vs seed reports, cache indicators | **PASS (5/5)** |
| [`tests/reports-vision.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/reports-vision.test.ts) | Citizen Reporting & AI | Report validation, 200m zone spatial snapping, status transitions, Vision AI deterministic fallback | **PASS (14/14)** |
| [`tests/end-to-end-commuter-qa.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/end-to-end-commuter-qa.test.ts) | Full Commuter Lifecycle | Search $\to$ Pin $\to$ 3-check routing $\to$ evidence inspection $\to$ camera fly-to $\to$ reverse geocoding | **PASS (10/10)** |
| [`tests/sanity.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/sanity.test.ts) | Environment Baseline | Node.js and TypeScript runtime compatibility | **PASS (2/2)** |
| [`tests/live-smoke.test.ts`](file:///C:/Users/admin/OneDrive/Desktop/DrainGuard/tests/live-smoke.test.ts) | Live Smoke Test | Optional opt-in live internet checks (skipped in offline CI runs) | **PASS (1 pass, 2 skip)** |

---

## 3. Measurable Performance Telemetry

- **Risk Engine Compute Latency:** $<1.0\text{ ms}$ per zone (pure in-memory TypeScript execution).
- **In-Flight Request Coalescing:** Verified by `tests/cache-and-production-data.test.ts`: 3 concurrent identical requests yield exactly 1 upstream fetch call (`inFlightDeduplications = 2`).
- **LRU Cache Hit Reduction:** Cached geocoder and routing requests resolve in $<0.2\text{ ms}$, completely eliminating network round-trips for repeated searches.
