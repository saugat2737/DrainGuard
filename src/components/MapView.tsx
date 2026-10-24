"use client";

import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import { Zone, ZoneRisk, RiskLevel } from "@/lib/types";
import { HazardHotspot } from "@/lib/routing";
import { BASEMAP_PROVIDERS } from "@/lib/basemaps";

interface MapViewProps {
  zones: (Zone & { risk: ZoneRisk })[];
  selectedZoneId: string | null;
  onSelectZone: (zone: Zone & { risk: ZoneRisk }) => void;
  center?: [number, number];
  zoom?: number;
  routeGeometry?: [number, number][] | null;
  routeType?: "fastest" | "safest" | "balanced";
  showRiskZones?: boolean;
  showReportsLayer?: boolean;
  hazardHotspots?: HazardHotspot[];
  onSelectHotspot?: (zoneId: string) => void;
  basemapId?: "osm_streets" | "opentopo_terrain";
}

const RISK_COLORS: Record<RiskLevel, { stroke: string; fill: string; label: string }> = {
  low: { stroke: "#22C55E", fill: "#22C55E", label: "Low" },
  medium: { stroke: "#F5B942", fill: "#F5B942", label: "Medium" },
  high: { stroke: "#F97316", fill: "#F97316", label: "High" },
  severe: { stroke: "#EF4444", fill: "#EF4444", label: "Severe" },
};

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapView({
  zones,
  selectedZoneId,
  onSelectZone,
  center = [13.3392, 77.1140],
  zoom = 14,
  routeGeometry = null,
  routeType = "safest",
  showRiskZones = true,
  showReportsLayer = true,
  hazardHotspots = [],
  onSelectHotspot,
  basemapId = "osm_streets",
}: MapViewProps) {
  const activeBasemap = BASEMAP_PROVIDERS[basemapId] || BASEMAP_PROVIDERS.osm_streets;

  const getRouteColor = () => {
    switch (routeType) {
      case "safest":
        return "#20D6C2"; // Aqua
      case "balanced":
        return "#38BDF8"; // Cyan
      case "fastest":
      default:
        return "#F59E0B"; // Amber
    }
  };

  return (
    <div className="relative w-full h-full min-h-[100%] overflow-hidden bg-[#0B1220]">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          key={activeBasemap.id}
          attribution={activeBasemap.attribution}
          url={activeBasemap.url}
          maxZoom={activeBasemap.maxZoom}
        />

        <MapRecenter center={center} />

        {/* Driving Route Polyline */}
        {routeGeometry && routeGeometry.length > 1 && (
          <>
            {/* Outer shadow/casing */}
            <Polyline
              positions={routeGeometry.map(([lng, lat]) => [lat, lng])}
              pathOptions={{
                color: "#0B1220",
                weight: 9,
                opacity: 0.8,
              }}
            />
            {/* Active route stroke */}
            <Polyline
              positions={routeGeometry.map(([lng, lat]) => [lat, lng])}
              pathOptions={{
                color: getRouteColor(),
                weight: 6,
                opacity: 0.95,
                dashArray: routeType === "fastest" ? "8 6" : undefined,
              }}
            />
            {/* Start & End Point Markers */}
            <CircleMarker
              center={[routeGeometry[0][1], routeGeometry[0][0]]}
              radius={7}
              pathOptions={{
                color: "#FFFFFF",
                fillColor: "#22C55E",
                fillOpacity: 1,
                weight: 2.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -5]}>
                <span className="font-semibold text-xs text-slate-900">Trip Origin</span>
              </Tooltip>
            </CircleMarker>
            <CircleMarker
              center={[
                routeGeometry[routeGeometry.length - 1][1],
                routeGeometry[routeGeometry.length - 1][0],
              ]}
              radius={7}
              pathOptions={{
                color: "#FFFFFF",
                fillColor: "#EF4444",
                fillOpacity: 1,
                weight: 2.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -5]}>
                <span className="font-semibold text-xs text-slate-900">Destination</span>
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Grounded Flood Risk Zones Polygons / Polylines */}
        {showRiskZones &&
          zones.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            const colors = RISK_COLORS[zone.risk.level] || RISK_COLORS.low;
            const geometry = zone.geometry;

            if (geometry.type === "Polygon") {
              const positions: [number, number][] = geometry.coordinates[0].map(
                ([lng, lat]) => [lat, lng]
              );

              return (
                <Polygon
                  key={zone.id}
                  positions={positions}
                  pathOptions={{
                    color: isSelected ? "#38BDF8" : colors.stroke,
                    fillColor: colors.fill,
                    fillOpacity: isSelected ? 0.6 : 0.35,
                    weight: isSelected ? 3 : 1.8,
                    dashArray: isSelected ? "4 4" : undefined,
                  }}
                  eventHandlers={{
                    click: () => onSelectZone(zone),
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.96}>
                    <div className="text-xs p-1 font-sans">
                      <div className="font-bold text-slate-900">{zone.name}</div>
                      <div className="text-slate-700">
                        Risk: <strong style={{ color: colors.stroke }}>{zone.risk.score}/100</strong> ({colors.label})
                      </div>
                      {zone.basis && (
                        <div className="text-[10px] text-cyan-700 font-semibold mt-0.5 capitalize">
                          Basis: {zone.basis.replace(/_/g, " ")}
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </Polygon>
              );
            }

            if (geometry.type === "LineString") {
              const positions: [number, number][] = geometry.coordinates.map(
                ([lng, lat]) => [lat, lng]
              );

              return (
                <Polyline
                  key={zone.id}
                  positions={positions}
                  pathOptions={{
                    color: isSelected ? "#38BDF8" : colors.stroke,
                    weight: isSelected ? 7 : 4.5,
                    opacity: isSelected ? 0.95 : 0.8,
                  }}
                  eventHandlers={{
                    click: () => onSelectZone(zone),
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.96}>
                    <div className="text-xs p-1 font-sans">
                      <div className="font-bold text-slate-900">{zone.name}</div>
                      <div className="text-slate-700">
                        Risk: <strong style={{ color: colors.stroke }}>{zone.risk.score}/100</strong> ({colors.label})
                      </div>
                      {zone.basis && (
                        <div className="text-[10px] text-cyan-700 font-semibold mt-0.5 capitalize">
                          Basis: {zone.basis.replace(/_/g, " ")}
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </Polyline>
              );
            }

            return null;
          })}

        {/* Hazard Hotspot Markers along active route */}
        {showReportsLayer &&
          hazardHotspots.map((spot) => {
            const matchedZone = zones.find((z) => z.id === spot.zone_id);
            if (!matchedZone) return null;

            let spotCenter: [number, number] | null = null;
            if (matchedZone.geometry.type === "Polygon") {
              spotCenter = [
                matchedZone.geometry.coordinates[0][0][1],
                matchedZone.geometry.coordinates[0][0][0],
              ];
            } else if (matchedZone.geometry.type === "LineString") {
              spotCenter = [
                matchedZone.geometry.coordinates[0][1],
                matchedZone.geometry.coordinates[0][0],
              ];
            }

            if (!spotCenter) return null;

            return (
              <CircleMarker
                key={`hotspot-${spot.zone_id}`}
                center={spotCenter}
                radius={9}
                pathOptions={{
                  color: "#FFFFFF",
                  fillColor: spot.risk_score >= 80 ? "#EF4444" : "#F97316",
                  fillOpacity: 0.95,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectZone(matchedZone);
                    if (onSelectHotspot) onSelectHotspot(spot.zone_id);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -5]}>
                  <div className="text-xs p-1 font-sans">
                    <span className="font-bold block text-rose-600">⚠ Waterlogging Hazard</span>
                    <span className="font-medium text-slate-800">{spot.zone_name}</span>
                    <span className="block text-slate-600 mt-0.5">
                      Score: {spot.risk_score}/100 · {spot.open_reports_count} open reports
                    </span>
                    {spot.basis && (
                      <span className="block text-[10px] text-slate-500 italic mt-0.5">
                        Grounding: {spot.basis.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
