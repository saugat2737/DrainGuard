# DrainGuard System Architecture & Technical Specifications

## 1. Architectural Principles
DrainGuard is engineered around five strict architectural tenets:
1. **Explainable & Deterministic:** Risk calculations and route scoring run as pure mathematical functions without opaque machine-learning black boxes or non-reproducible outputs.
2. **Strict Zero-Paid-API Footprint:** Prohibits commercial subscriptions, credit-card requirements, or billing lock-in (Google Maps, TomTom, Mapbox paid tiers excluded).
3. **High-Performance Bounded Caching:** In-memory LRU caching with in-flight request deduplication protects public open-data endpoints from rate throttling.
4. **Data Honesty & Provenance:** Production never injects fake congestion lines, synthetic flood boundaries, or demonstration records into live responses.
5. **Map-First Responsive Design:** Mobile-first, tactile UI inspired by Namma Yatri's ergonomic bottom sheet and floating control layers.

---

## 2. High-Level System Architecture & C4 Container Model

```mermaid
C4Context
    title System Context Diagram - DrainGuard Urban Risk Intelligence

    Person(commuter, "Urban Commuter", "Plans rain-safe driving routes and reports drain blockages")
    Person(municipal, "Municipal Crew", "Inspects and prioritizes drainage desilting actions")

    System(drainguard, "DrainGuard Web Application", "Next.js 14 App Router platform providing real-time hazard mapping, 3-check routing, and inspection dispatch")

    System_Ext(openmeteo, "Open-Meteo REST API", "Free NWP precipitation forecasts and 7-day historical weather archive")
    System_Ext(osrm, "Project-OSRM Gateway", "OpenStreetMap road network driving geometries and baseline travel times")
    System_Ext(photon, "Photon Geocoding (Komoot)", "Search-as-you-type and reverse geocoding with Tumakuru geographic bias")
    System_Ext(osm_tiles, "OpenStreetMap & OpenTopoMap", "Attributed raster basemaps and SRTM contour elevation tiles")
    System_Ext(gemini, "Google Gemini Vision API", "Optional free-tier multimodal AI drain blockage classifier")

    Rel(commuter, drainguard, "Searches places, views routes, reports blockages", "HTTPS / Browser")
    Rel(municipal, drainguard, "Monitors inspection queue, updates report status", "HTTPS / Browser")

    Rel(drainguard, openmeteo, "Fetches forecast & antecedent rain", "HTTPS / JSON")
    Rel(drainguard, osrm, "Requests candidate driving routes", "HTTPS / GeoJSON")
    Rel(drainguard, photon, "Queries place autocomplete & reverse labels", "HTTPS / GeoJSON")
    Rel(drainguard, osm_tiles, "Renders street and terrain cartography", "HTTPS / Tile PNG")
    Rel(drainguard, gemini, "Classifies uploaded drain images (optional)", "HTTPS / REST")
```

---

## 3. Component Architecture & Next.js Module Organization

```mermaid
graph TD
    subgraph Client["Client UI Layer (React 18 / Next.js 14 App Router)"]
        Page["src/app/page.tsx (Commuter Home)"]
        MunPage["src/app/municipal/page.tsx (Operations Queue)"]
        MapW["MapWrapper & MapView (React-Leaflet)"]
        JP["JourneyPlanner (Route Comparisons)"]
        PAI["PlaceAutocompleteInput (Photon Search)"]
        MSB["MapSearchBar (Landmark Fly-to)"]
        LC["LayerControls (Basemap & Hazard Toggles)"]
        RF["ReportForm (Blockage Submissions)"]
        SSD["ServiceStatusDrawer (Telemetry)"]
    end

    subgraph API["Serverless API Route Handlers (Edge / Node Runtime)"]
        R_Route["src/app/api/route/route.ts"]
        R_Geocode["src/app/api/geocode/route.ts"]
        R_Zones["src/app/api/zones/route.ts"]
        R_Reports["src/app/api/reports/route.ts"]
        R_Weather["src/app/api/weather/route.ts"]
        R_Status["src/app/api/status/route.ts"]
    end

    subgraph Domain["Domain & Processing Engines"]
        RiskEng["src/lib/risk.ts (4-Factor Engine)"]
        RouteEng["src/lib/routing.ts (Turf Spatial Buffer & Multi-Criteria Ranking)"]
        GeoAdapter["src/lib/geocoding.ts (Photon Adapter)"]
        WeatherAdapter["src/lib/weather.ts (Forecast & Historical Archive)"]
        ReportStore["src/lib/reports-store.ts (Runtime Store & 200m Buffer Matching)"]
    end

    subgraph Caching["Centralized Bounded Caching Layer"]
        AppCacheClass["src/lib/cache/app-cache.ts (LRU Eviction + In-Flight Coalescing)"]
        CacheInstances["src/lib/cache/instances.ts (Photon, OSRM, Weather, Status Caches)"]
    end

    Page --> MapW & JP & LC & SSD
    JP --> PAI
    MapW --> MSB
    MunPage --> ReportStore

    JP -.->|POST| R_Route
    PAI & MSB -.->|GET| R_Geocode
    MapW -.->|GET| R_Zones
    RF -.->|POST| R_Reports

    R_Route --> RouteEng & RiskEng & WeatherAdapter
    R_Geocode --> GeoAdapter
    R_Zones --> RiskEng & ReportStore
    R_Weather --> WeatherAdapter

    GeoAdapter & RouteEng & WeatherAdapter --> CacheInstances
    CacheInstances --> AppCacheClass
```

---

## 4. End-to-End Sequence Diagrams

### A. Place Autocomplete & Commuter Route Comparison
```mermaid
sequenceDiagram
    autonumber
    actor Commuter
    participant UI as JourneyPlanner UI
    participant GeocodeAPI as /api/geocode
    participant PhotonCache as photonSearchCache
    participant PhotonUpstream as Photon Komoot API
    participant RouteAPI as /api/route
    participant OSRMCache as osrmRouteCache
    participant OSRMUpstream as Project-OSRM Gateway
    participant Turf as Turf.js Spatial Engine
    participant Risk as Pure Risk Engine

    Commuter->>UI: Types "Tumkur Bus Stand" (debounced 320ms)
    UI->>GeocodeAPI: GET /api/geocode?q=Tumkur+Bus+Stand
    GeocodeAPI->>PhotonCache: getOrLoad(key)
    alt Cache Miss
        PhotonCache->>PhotonUpstream: GET /api/?q=Tumkur+Bus+Stand&lat=13.3392&lon=77.114
        PhotonUpstream-->>PhotonCache: GeoJSON FeatureCollection
        PhotonCache-->>GeocodeAPI: Parsed [lat, lng] Places
    else Cache Hit / Coalesced
        PhotonCache-->>GeocodeAPI: Cached Places
    end
    GeocodeAPI-->>UI: Autocomplete suggestions list
    Commuter->>UI: Selects destination & clicks "Find Rain-Safe Routes"

    UI->>RouteAPI: POST /api/route {origin, destination, rain_mm}
    RouteAPI->>OSRMCache: getOrLoad(osrm_key)
    alt Route Cache Miss
        OSRMCache->>OSRMUpstream: GET /route/v1/driving/...?alternatives=true
        OSRMUpstream-->>OSRMCache: Alternative Route Geometries
        OSRMCache-->>RouteAPI: Raw Candidate Polylines
    else Route Cache Hit
        OSRMCache-->>RouteAPI: Cached Candidate Polylines
    end

    RouteAPI->>Turf: Buffer each candidate line by 30 meters
    RouteAPI->>Risk: Compute length-weighted risk exposure against 10 zones
    RouteAPI->>Risk: Compare Fastest vs Rain-Safer vs Balanced (+40% rule)
    RouteAPI-->>UI: Return Scored Routes + 3-Check Evidence Triad
    UI->>Commuter: Renders Aqua (Safer), Cyan (Balanced), Amber (Fastest) on Leaflet Map
```

---

## 5. Architectural Technology Rationale

| Layer | Selected Technology | Evaluated Alternatives | Technical Rationale & Trade-off Justification |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js 14 App Router + React 18** | Vite SPA, Remix, SvelteKit | Provides unified full-stack TypeScript API route handlers and React Server Components. Eliminates cross-origin CORS configuration and supports built-in server-side caching. |
| **Mapping Engine** | **Leaflet + React-Leaflet 4** | MapLibre GL, OpenLayers, Google Maps JS | Extremely lightweight bundle footprint (~40 KB gzip vs ~250 KB for MapLibre/Mapbox GL). Works reliably on mobile low-bandwidth devices without requiring WebGL 2 hardware acceleration. |
| **Geospatial Processing** | **Turf.js (@turf/turf 7)** | PostGIS server, JSTS, GDAL | Client/Node pure JavaScript computational geometry. Performs point-in-polygon tests and line buffering in $<10$ ms in-memory without requiring heavy database installations. |
| **Routing Provider** | **Project-OSRM Public Demo** | GraphHopper, Valhalla, Google Routes | Free public demo gateway built on OpenStreetMap road topologies. Returns true driving geometries with turn-by-turn distance and duration. |
| **Geocoding Adapter** | **Photon by Komoot** | OSM Nominatim, Mapbox Search, Google Places | Zero-cost open data (ODbL). Supports search-as-you-type and reverse geocoding with geographic bias. Strictly avoids violating OSM Nominatim's strict autocomplete ban. |
| **Caching Engine** | **Bounded In-Memory AppCache (LRU)** | Redis, Memcached, SQLite | Zero-dependency, single-process bounded memory storage. In-flight promise coalescing prevents "thundering herd" upstream calls without external hosting costs. |
