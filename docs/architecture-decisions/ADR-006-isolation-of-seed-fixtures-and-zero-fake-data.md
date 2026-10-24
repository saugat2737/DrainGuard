# ADR-006: Strict Isolation of Seed Fixtures & Zero Fake Data Policy

## Status
Accepted

## Context
Many civic tech prototypes and hackathon submissions simulate realism by embedding hardcoded mock sensor readings, fake live weather numbers, artificial traffic congestion overlays, or fabricated flood polygon geometries with undulating contours that resemble real floodplains but lack geographic provenance.

In civic safety and disaster intelligence systems, presenting synthetic demonstration data as verified live state can mislead commuters, misallocate emergency rescue resources, and erode institutional trust with municipal stakeholders.

## Decision
DrainGuard establishes a strict **Zero Fake Data Architecture Policy**:
1. **Provenance & Attribution Registry:** Every flood polygon in the production catalog (`src/lib/data/floodZones.geojson`) must have an auditable, defensible geographic justification (e.g., historical inundation record, railway underpass dip, lake overflow boundary, SRTM depression basin). No polygon may be drawn purely for aesthetic realism.
2. **Explicit Service Status Classification:** Every external provider integration must expose its truthful operational state to the UI via `/api/status`:
   - `live`: Successfully queried upstream open API within TTL.
   - `cached`: Serving unexpired process-local bounded cache due to upstream throttling or offline resilience.
   - `fallback`: Serving deterministic baseline estimate with clear disclosure.
   - `unavailable_locally`: Truthfully stating when data does not exist (e.g., `historical_flood_records_status: "unavailable_locally"` for Tumakuru City Corporation digital inundation GIS shapefiles).
3. **Fixture Quarantine:** Demonstration seeds and mock test fixtures are strictly segregated under test environments or clearly labeled demo boundaries. Production runtime code paths never inject artificial sensor values or disguised random numbers.
4. **Transparent Degradation:** If live weather or traffic APIs fail, the commuter interface explicitly warns the user that baseline estimates are in effect rather than displaying fabricated green traffic lines or stale rainfall figures without disclosure.

## Consequences
### Positive
- **Auditable Integrity:** Municipal engineers and emergency response teams can trust every risk notification and data point presented by the system.
- **Academic & Public Defensibility:** Eliminates the risk of presenting synthetic data as empirical truth in research publications, hackathon reviews, or public deployments.
- **Robust Error Handling:** Code paths are forced to handle real-world API latency, network drops, and missing data honestly.

### Negative / Trade-offs
- UI cannot promise uniform high-density traffic flow lines in areas where open real-time traffic speeds are unmetered.
- Baseline travel time estimations must rely on OSM highway speed limits rather than dynamic traffic probe data when open probe data is absent.
