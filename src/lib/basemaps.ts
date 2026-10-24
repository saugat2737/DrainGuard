/**
 * Free & Open Basemap Providers Registry
 * Allows compliant zero-cost tile layers to be switched without rewriting components.
 */

export interface BasemapLayerConfig {
  id: "osm_streets" | "opentopo_terrain" | "carto_dark";
  name: string;
  type: "streets" | "terrain";
  url: string;
  attribution: string;
  maxZoom: number;
}

export const BASEMAP_PROVIDERS: Record<string, BasemapLayerConfig> = {
  osm_streets: {
    id: "osm_streets",
    name: "OpenStreetMap Standard",
    type: "streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  opentopo_terrain: {
    id: "opentopo_terrain",
    name: "OpenTopoMap Terrain (DEM Contours)",
    type: "terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
};
