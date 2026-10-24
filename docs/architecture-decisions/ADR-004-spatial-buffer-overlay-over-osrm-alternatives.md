# ADR-004: Spatial Buffer Overlay Over OSRM Route Alternatives

## Status
Accepted

## Context
Standard open-source routing engines such as OSRM operate on static road network topologies (extracted from OpenStreetMap tags) and optimize strictly for shortest travel time or physical distance based on speed limits. They possess no native concept of dynamic pluvial flood depth, real-time catchment saturation, or citizen-reported waterlogging obstacles.

Rebuilding or dynamically updating contraction hierarchies (CH) or multi-level Dijkstra (MLD) graphs on an OSRM backend every few minutes when rainfall changes or new citizen reports arrive is computationally prohibitive for a real-time web application.

## Decision
DrainGuard decouples topological pathfinding from dynamic hydrological risk evaluation:
1. **Multi-Alternative Topological Ingestion:** The routing service queries OSRM with `alternatives=true&overview=full&geometries=geojson`, retrieving up to three topologically distinct candidate paths through the city network.
2. **Spatial Coordinate Discretization & Turf.js Buffering:** Each candidate linestring is sampled at granular spatial vertices. For high-risk localized features (such as citizen waterlogging hazard points), Turf.js spatial buffers (default 200-meter radius) are projected around obstacles.
3. **Point-in-Polygon & Spatial Overlay:** Candidate linestring segments are overlaid against:
   - Ground-truthed low-elevation flood hazard zones (`turf.booleanPointInPolygon` or polygon intersection).
   - Citizen-reported waterlogging incident buffers.
4. **Hydrological Penalty Weighting:** Linestring segments that intersect hazard geometries are assigned risk penalties based on the 4-factor risk formula ($R_{weather}, R_{hazard}, R_{drain}, R_{reports}$). The aggregate route risk is computed as the distance-weighted or segment-maximum risk score.
5. **Multi-Criteria Route Recommendation:** Routes are ranked and recommended using a safety-first pareto evaluation:
   - **Safest Route:** The candidate minimizing total waterlogging exposure ($S_{route} < 40$).
   - **Fastest Route:** The baseline shortest-duration path (with risk warnings clearly highlighted if $S_{route} \ge 40$).
   - **Alternative Safe Route:** Secondary viable diversion avoiding primary flood corridors.

## Consequences
### Positive
- **Instant Response Times:** Avoids re-computing expensive road network contraction hierarchies on the fly; evaluations complete in $< 15$ ms in pure TypeScript.
- **Explainability:** Each route segment contains granular risk breakdowns explaining *why* a diversion is recommended (e.g., "Passes through Kyatsandra Railway Underpass (Elevation: 804m) with 2 active waterlogging reports").
- **Graceful Fallback:** If OSRM is unreachable or returns only a single path, spatial straight-line interpolation with intermediate waypoint buffering provides an honest baseline estimate with clear status indicators.

### Negative / Trade-offs
- OSRM's topological alternatives are chosen based on travel time differences, meaning an ideal flood-avoiding path that requires a substantial detour might not be among the top 3 alternatives returned by default OSRM queries.
- **Mitigation:** Future work details integration with pgRouting / Valhalla dynamic edge-cost penalization.
