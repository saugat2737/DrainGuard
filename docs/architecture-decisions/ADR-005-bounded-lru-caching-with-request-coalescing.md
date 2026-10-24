# ADR-005: Centralized Bounded LRU Cache & In-Flight Coalescing

## Status
**Accepted**

## Context
Relying on free public open-data gateways (Photon, Open-Meteo, OSRM) exposes the application to rate throttling, transient timeouts, and slow round-trips if components issue redundant upstream requests. Previously, components and modules managed disparate, ad-hoc `Map` instances with no memory bounds, leaving the system vulnerable to memory leaks and "thundering herd" concurrency spikes.

## Decision
1. Implement a unified, bounded in-memory caching engine (`src/lib/cache/app-cache.ts`) using JavaScript `Map` insertion ordering for true Least Recently Used (LRU) eviction when entry counts exceed `maxSize`.
2. Implement **per-key in-flight request deduplication**: if a network request is already pending for a cache key, subsequent callers receive the existing promise rather than firing duplicate upstream requests.
3. Support **stale-if-error**: serve previously validated data during a configured grace window if the upstream service experiences an outage.
4. Establish centralized policy configurations (`CACHE_POLICIES` in `app-cache.ts`):
   - Photon Search: 10m TTL, 300 entries
   - Photon Reverse: 24h TTL, 500 entries
   - Weather Forecast: 12m TTL, 50 entries
   - Antecedent Archive: 12h TTL, 50 entries
   - OSRM Routes: 8m TTL, 150 entries

## Consequences
- **Positive:** Bounded process memory, zero external infrastructure costs, dramatic reduction in upstream network requests, and resiliency against transient public gateway dropouts.
- **Negative / Limitation:** Single-process memory cache is not shared across multi-instance serverless deployments; documented as process-local.
