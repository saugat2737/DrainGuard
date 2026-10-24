# Geospatial Data Catalog & Polygon Provenance Registry

## 1. Overview and Coordinate Standards
All geographic coordinates in DrainGuard strictly adhere to:
- **Spatial Reference System:** WGS 84 (EPSG:4326).
- **GeoJSON Serialization Order:** `[longitude, latitude]` per IETF RFC 7946.
- **Leaflet Map Rendering Order:** `[latitude, longitude]`.
- **Polygon Ring Closure:** Counter-clockwise outer boundary, strictly closed where `first_vertex == last_vertex`.

---

## 2. Ingested Geospatial Datasets

| Dataset Identifier | Provider / Source | License & Attribution | Native CRS | Spatial Resolution | Ingested Role |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **OpenStreetMap Street Network** | OpenStreetMap Contributors | Open Database License (ODbL) | EPSG:4326 | Sub-meter road vectors | Road network topology and driving geometries via OSRM |
| **OpenStreetMap Waterbody Polygons** | OpenStreetMap Contributors | ODbL 1.0 | EPSG:4326 | Boundary vectors | Grounding of Amanikere Lake basin and inflow drainage canals |
| **OpenTopoMap SRTM Elevation Contours** | OpenTopoMap / SRTM NASA | CC-BY-SA 3.0 / NASA Public Domain | EPSG:3857 | ~30-meter DEM | Topographical relief basemap layer and elevation validation |
| **Open-Meteo NWP Forecast Grid** | Open-Meteo (ECMWF / GFS) | Creative Commons Attribution 4.0 | EPSG:4326 | ~11-kilometer grid | Atmospheric precipitation rate and probability estimates |
| **Open-Meteo Historical Archive** | Open-Meteo (ERA5-Land Reanalysis) | CC-BY 4.0 | EPSG:4326 | ~9-kilometer grid | 24h, 72h, and 7-day antecedent saturation archives |

---

## 3. Grounded Flood Risk Zones Catalog (Tumakuru Demonstration Area)

Every polygon in `src/data/zones.seed.json` has documented hydrological justification, elevation approximation, and source provenance:

| Zone ID | Zone Name | Elevation | Geometry Type | Basis Category | Provenance & Hydrological Justification |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Z01** | Amanikere Lake Lowlands & Spillway | 798 m | `Polygon` | `waterbody_basin` | OpenStreetMap Amanikere waterbody polygon. Natural receiving basin and primary sink of Tumakuru city center. |
| **Z02** | B.H. Road Drainage Corridor | 805 m | `LineString` | `culvert_corridor` | Major arterial culvert bottleneck where storm runoff from northern wards crosses under Bangalore-Honnavar highway. |
| **Z03** | Tumakuru Railway Underbridge | 794 m | `LineString` | `underpass_sink` | Deep road underpass beneath Southern Railway tracks; severe localized basin during storm bursts. |
| **Z04** | SS Puram Residential Lowland | 808 m | `Polygon` | `natural_depression` | Low-lying residential ward between university ridge and lake basin with shallow infiltration capacity. |
| **Z05** | Batawadi Industrial Culvert Sump | 801 m | `Polygon` | `culvert_corridor` | Industrial estate natural drainage swale conveying surface runoff eastward toward national highway drains. |
| **Z06** | M.G. Road Commercial Sunk Corridor | 803 m | `Polygon` | `natural_depression` | High-imperviousness retail corridor with historical drainage bottlenecks near central market. |
| **Z07** | Sitapura Tank Inflow Channel | 797 m | `Polygon` | `waterbody_basin` | Wetland buffer and ephemeral inflow canal feeding Sitapura catchment lake south of city center. |
| **Z08** | Gubbi Gate Market Sump | 799 m | `Polygon` | `natural_depression` | Old-city commercial market basin receiving storm runoff from higher western wards. |
| **Z09** | Tumkur University Elevated Ridge | 832 m | `Polygon` | `elevated_ridge` | Elevated granite bedrock ridge; steep terrain with rapid natural drainage and minimal flood exposure. |
| **Z10** | Kyatsandra Highway Underpass | 792 m | `Polygon` | `underpass_sink` | National Highway underpass serving southeastern residential traffic; localized depression and water accumulation point. |

---

## 4. Provenance & Uncertainty Disclosure
- **Absence of Official Municipal Inundation GIS:** Tumakuru City Corporation (TCC) has not released authoritative digital flood-hazard GIS layers as open data. DrainGuard explicitly states this in `historical_flood_records_status: "unavailable_locally"`.
- **Topographical Grounding vs. Physical Simulation:** Zones in DrainGuard reflect topographically verified waterbody basins and road bottlenecks. They are **demonstration zones grounded in physical topography**, not guaranteed flood extents.
