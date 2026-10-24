"use client";

import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import { Zone, ZoneRisk, RiskLevel } from "@/lib/types";

interface MapViewProps {
  zones: (Zone & { risk: ZoneRisk })[];
  selectedZoneId: string | null;
  onSelectZone: (zone: Zone & { risk: ZoneRisk }) => void;
  center?: [number, number];
  zoom?: number;
  routeGeometry?: [number, number][] | null;
  routeType?: "fastest" | "safest";
}

// Operational risk colors from official Brand Kit & docs/07_UI_UX_SPEC.md
const RISK_COLORS: Record<RiskLevel, { stroke: string; fill: string }> = {
  low: { stroke: "#34D399", fill: "#34D399" },
  medium: { stroke: "#F5B942", fill: "#F5B942" },
  high: { stroke: "#FB7185", fill: "#FB7185" },
  severe: { stroke: "#EF4444", fill: "#EF4444" },
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
}: MapViewProps) {
  return (
    <div className="relative w-full h-full min-h-[440px] rounded-xl overflow-hidden border border-slate-700/60 shadow-xl shadow-black/30">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={center} />

        {/* Display computed active driving route line if present */}
        {routeGeometry && routeGeometry.length > 1 && (
          <Polyline
            positions={routeGeometry.map(([lng, lat]) => [lat, lng])}
            pathOptions={{
              color: routeType === "safest" ? "#20D6C2" : "#38BDF8",
              weight: 6,
              opacity: 0.95,
              dashArray: routeType === "safest" ? undefined : "6 6",
            }}
          />
        )}

        {zones.map((zone) => {
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
                  fillOpacity: isSelected ? 0.65 : 0.42,
                  weight: isSelected ? 3.5 : 2,
                  dashArray: isSelected ? "4 4" : undefined,
                }}
                eventHandlers={{
                  click: () => onSelectZone(zone),
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="text-xs font-sans p-1">
                    <span className="font-bold block text-slate-900">{zone.name}</span>
                    <span className="text-slate-700">
                      Score: <strong style={{ color: colors.stroke }}>{zone.risk.score}</strong> ({zone.risk.level.toUpperCase()})
                    </span>
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
                  weight: isSelected ? 7 : 5,
                  opacity: isSelected ? 0.95 : 0.82,
                }}
                eventHandlers={{
                  click: () => onSelectZone(zone),
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="text-xs font-sans p-1">
                    <span className="font-bold block text-slate-900">{zone.name}</span>
                    <span className="text-slate-700">
                      Score: <strong style={{ color: colors.stroke }}>{zone.risk.score}</strong> ({zone.risk.level.toUpperCase()})
                    </span>
                  </div>
                </Tooltip>
              </Polyline>
            );
          }

          return null;
        })}
      </MapContainer>

      {/* Floating Map Legend (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-[400] bg-[#0B1220]/92 backdrop-blur-md border border-slate-700/80 px-3.5 py-2.5 rounded-lg shadow-xl text-slate-200 text-xs flex items-center gap-3.5">
        <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">
          Risk:
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" /> Low (0-29)
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" /> Medium (30-59)
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FB7185]" /> High (60-79)
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Severe (80-100)
        </span>
      </div>
    </div>
  );
}
