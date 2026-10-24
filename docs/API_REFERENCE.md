# DrainGuard REST API Reference Specification

## 1. Core Endpoints Overview

| Method | Path | Function | Caching Policy | Key Required? |
| :---: | :--- | :--- | :--- | :---: |
| `POST` | `/api/route` | Multi-criteria 3-route hazard comparison | 8-min OSRM geometry cache | None |
| `GET` | `/api/geocode` | Place search & reverse geocoding | 10-min search / 24-hr reverse | None |
| `GET` | `/api/zones` | Street zone risk calculation ($0-100$) | Dynamic / In-memory | None |
| `GET` | `/api/weather` | 3h precipitation forecast & timeline | 12-min forecast cache | None |
| `POST` | `/api/reports` | Citizen blockage submission | Immediate write to runtime store | None |
| `GET` | `/api/reports` | List all submitted blockage reports | Sorted newest first | None |
| `PATCH`| `/api/reports/[id]` | Update municipal dispatch status | In-memory atomic state update | None |
| `GET` | `/api/inspections` | Ranked municipal desilting queue | Dynamic risk-sorted queue | None |
| `GET` | `/api/status` | System health & diagnostic telemetry | Process-local cached | None |
| `POST` | `/api/analyze` | AI visual drain waste classifier | Optional Gemini key / Fallback | Optional |

---

## 2. Endpoint Specifications

### A. Route Evaluation & Multi-Criteria Navigation
`POST /api/route`

#### Request Body
```json
{
  "origin": { "lat": 13.3465, "lng": 77.1215 },
  "destination": { "lat": 13.3411, "lng": 77.1025 },
  "rain_mm": 25.0,
  "is_simulated": false
}
```

#### Response (200 OK)
```json
{
  "data": {
    "fastest": {
      "id": "route-fastest",
      "preference": "fastest",
      "duration_s": 420,
      "distance_m": 2450,
      "risk_score": 68,
      "geometry": { "type": "LineString", "coordinates": [[77.1215, 13.3465], [77.1025, 13.3411]] },
      "hazard_hotspots": [{ "zone_id": "Z03", "zone_name": "Railway Underbridge", "risk_score": 70 }]
    },
    "safest": {
      "id": "route-safest",
      "preference": "safest",
      "duration_s": 480,
      "distance_m": 2720,
      "risk_score": 24,
      "delay_vs_fastest_s": 60,
      "geometry": { "type": "LineString", "coordinates": [[77.1215, 13.3465], [77.1025, 13.3411]] },
      "evidence_check": {
        "current_forecast_rain": { "rain_mm": 25.0, "source": "Open-Meteo REST API" },
        "antecedent_and_history": { "past_24h_mm": 14.2, "past_7d_mm": 38.6 },
        "traffic_feasibility": { "status": "baseline_estimates_only" }
      }
    },
    "recommendation": "safest",
    "reason": "Rain-safer route recommended (+1 min adds +14% time, avoiding high-risk Railway Underbridge sump)."
  }
}
```

---

### B. Place Search & Reverse Geocoding
`GET /api/geocode?q={query}&limit={limit}`  
`GET /api/geocode?mode=reverse&lat={lat}&lng={lng}`

#### Forward Search Response (200 OK)
```json
{
  "data": {
    "places": [
      {
        "id": "photon-W-400940812-13.3411-77.1025",
        "name": "Tumkur KSRTC Bus Stand",
        "displayName": "Tumkur KSRTC Bus Stand, KSRTC Link Road, Tumakuru, Karnataka 572101",
        "lat": 13.3411,
        "lng": 77.1025,
        "provenance": "photon_live"
      }
    ],
    "provider": "photon",
    "cached": true
  }
}
```

---

### C. Service Health & Transparency Telemetry
`GET /api/status`

#### Response (200 OK)
```json
{
  "data": {
    "timestamp": "2026-10-25T02:10:00.000Z",
    "overall_status": "healthy",
    "services": [
      {
        "service": "weather",
        "name": "Open-Meteo Precipitation Forecast",
        "status": "available",
        "mode": "live_rest",
        "data_source": "Open-Meteo WMO NWP Grid (Free, Zero-Cost Open API)",
        "requires_credentials": false
      },
      {
        "service": "routing",
        "name": "OSRM Driving Router (OpenStreetMap)",
        "status": "available",
        "mode": "public_osm_api",
        "requires_credentials": false
      },
      {
        "service": "geocoding",
        "name": "Photon Open-Data Geocoding & Landmark Search",
        "status": "available",
        "mode": "public_osm_api",
        "requires_credentials": false
      },
      {
        "service": "traffic",
        "name": "Live Vehicular Congestion Telemetry",
        "status": "unavailable",
        "mode": "strictly_zero_cost_policy",
        "message": "Live vehicular congestion data is not connected. Commercial paid APIs are strictly prohibited.",
        "requires_credentials": false
      }
    ],
    "environment": {
      "city": "Tumakuru, Karnataka, India",
      "coordinates": { "lat": 13.3392, "lng": 77.1140 },
      "storage_type": "in_memory"
    }
  }
}
```
