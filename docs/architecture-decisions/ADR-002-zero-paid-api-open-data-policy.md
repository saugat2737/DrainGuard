# ADR-002: Zero-Paid-API & Open Data Architecture Policy

## Status
Accepted

## Context
Commercial urban routing and navigation engines (e.g., Google Maps Platform, Mapbox, TomTom, HERE) impose recurring per-query licensing fees ($5 to $10 per 1,000 Directions requests; $5 per 1,000 Geocoding requests). For resource-constrained municipal corporations, developing-world smart city deployments, and open civic technology initiatives, dependency on proprietary paid APIs creates fiscal friction, vendor lock-in, and unpredictable operating expenditures during flood crises when navigation volume surges exponentially.

Furthermore, proprietary APIs function as black boxes: their underlying graph algorithms, routing penalty heuristics, and weather interpolation models cannot be audited or inspected by civil protection authorities or researchers.

## Decision
DrainGuard mandates an absolute **Zero-Paid-API** architectural policy across all tiers of the application:
1. **Routing:** Rely on the open-source Open Source Routing Machine (OSRM) public demo cluster (`https://router.project-osrm.org`) with fallback to deterministic spatial straight-line projections, and an architected migration path to self-hosted OSRM Docker instances.
2. **Geocoding & Reverse Geocoding:** Rely on the open-source Komoot Photon geocoder (`https://photon.komoot.io`) powered by OpenStreetMap data, backed by OSM Nominatim reverse geocoding for click-on-map point resolution.
3. **Meteorological Data:** Rely on the Open-Meteo public non-commercial weather API (`https://api.open-meteo.com`) providing sub-hourly precipitation forecasts and 72-hour antecedent rainfall via ECMWF IFS, DWD ICON, and GFS numerical weather prediction models without API keys.
4. **Basemaps & Elevation:** Rely on OpenStreetMap tile servers (`tile.openstreetmap.org`) and OpenTopoMap SRTM-derived elevation contours (`tile.opentopomap.org`).
5. **No Paid Dependencies:** The repository must not require credit cards, paid API keys, or cloud-metered subscriptions to install, run, test, or deploy.

## Consequences
### Positive
- **Zero Operating Cost for Civic Infrastructure:** Municipal authorities can clone and deploy DrainGuard on local infrastructure at zero recurring software licensing cost.
- **Explainability & Transparency:** Every data input originates from auditable open datasets with known provenance (ODbL, CC-BY-SA, CC-BY 4.0).
- **Sovereign Deployability:** The entire stack can be containerized and hosted entirely within municipal on-premise private clouds or offline disaster-response local networks.

### Negative / Trade-offs
- **Public Gateway Rate Limits:** Public community demo endpoints (OSRM, Photon, OpenTopoMap) possess fair-use concurrency thresholds and may experience transient latency spikes or throttling.
- **Mitigation:** DrainGuard implements client-side and server-side bounded LRU caching (`AppCache`), request deduplication/coalescing, and deterministic spatial fallbacks to protect public gateways and guarantee zero crash-failures.
