# ADR-003: Photon Geocoder Selection & Nominatim Autocomplete Safeguard

## Status
**Accepted**

## Context
Commuters require search-as-you-type autocomplete to input street names, landmarks, and bus stands. OpenStreetMap Foundation's acceptable usage policy strictly forbids directing autocomplete or search-as-you-type keystrokes to public `nominatim.openstreetmap.org` servers (requiring an absolute maximum rate limit of 1 req/sec and discouraging interactive search). Commercial alternatives (Google Places API, Mapbox Search) require paid billing accounts, violating our zero-cost requirement.

## Decision
1. Adopt **Photon by Komoot** (`https://photon.komoot.io/api/`), an open-source, high-performance geocoder built on OpenStreetMap / Nominatim open data, designed specifically for search-as-you-type.
2. Apply Tumakuru centroid location bias (`lat=13.3392`, `lon=77.1140`, `location_bias_scale=0.3`) to prioritize local landmarks.
3. Enforce an automated regression test safeguard in `tests/place-search.test.ts` ensuring that zero autocomplete queries are ever transmitted to `nominatim.openstreetmap.org`.
4. Implement offline landmark fallback (`TUMAKURU_OFFLINE_LANDMARKS`) with explicit `provenance: "local_offline_catalog"` metadata when upstream is unreachable.

## Consequences
- **Positive:** Fast, typo-tolerant search at zero cost with full compliance with OSM Foundation guidelines.
- **Negative / Limitation:** Public demo server does not provide an enterprise SLA; production deployments at scale should self-host Komoot Photon via Docker.
