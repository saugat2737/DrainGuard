"use client";

import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Zone, ZoneRisk, RiskLevel } from "@/lib/types";
import { HazardHotspot } from "@/lib/routing";
import { BASEMAP_PROVIDERS } from "@/lib/basemaps";
import { GeocodePlace } from "@/lib/geocoding";

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
  // Pick on map & place search props
  isPickingOnMap?: boolean;
  pickingTarget?: "origin" | "destination" | null;
  onMapClickCoord?: (lat: number, lng: number) => void;
  originPlace?: GeocodePlace | null;
  destinationPlace?: GeocodePlace | null;
  searchedPlace?: GeocodePlace | null;
  onClearSearchedPlace?: () => void;
  onSetSearchedPlaceAsOrigin?: (place: GeocodePlace) => void;
  onSetSearchedPlaceAsDestination?: (place: GeocodePlace) => void;
}

const RISK_COLORS: Record<RiskLevel, { stroke: string; fill: string; label: string }> = {
  low: { stroke: "#22C55E", fill: "#22C55E", label: "Low" },
  medium: { stroke: "#F5B942", fill: "#F5B942", label: "Medium" },
  high: { stroke: "#F97316", fill: "#F97316", label: "High" },
  severe: { stroke: "#EF4444", fill: "#EF4444", label: "Severe" },
};

// Smooth Camera Re-center
function MapRecenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// Map Event Handler for Picking Points
function MapClickHandler({
  isPicking,
  onPick,
}: {
  isPicking: boolean;
  onPick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isPicking && onPick) {
        onPick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
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
  isPickingOnMap = false,
  pickingTarget = null,
  onMapClickCoord,
  originPlace = null,
  destinationPlace = null,
  searchedPlace = null,
  onClearSearchedPlace,
  onSetSearchedPlaceAsOrigin,
  onSetSearchedPlaceAsDestination,
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
    <div
      className={`relative w-full h-full min-h-[100%] overflow-hidden bg-[#0B1220] ${
        isPickingOnMap ? "cursor-crosshair" : ""
      }`}
    >
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

        <MapRecenter center={center} zoom={zoom} />
        <MapClickHandler isPicking={isPickingOnMap} onPick={onMapClickCoord} />

        {/* Driving Route Polyline */}
        {routeGeometry && routeGeometry.length > 1 && (
          <>
            {/* Outer casing */}
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
          </>
        )}

        {/* Origin Pin (Selected or Route Start) */}
        {originPlace && (
          <CircleMarker
            center={[originPlace.lat, originPlace.lng]}
            radius={9}
            pathOptions={{
              color: "#FFFFFF",
              fillColor: "#22C55E",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent={false}>
              <div className="text-xs p-1 font-sans">
                <span className="font-bold text-emerald-700 block">Trip Origin</span>
                <span className="text-slate-900 font-semibold">{originPlace.name}</span>
              </div>
            </Tooltip>
          </CircleMarker>
        )}

        {/* Destination Pin (Selected or Route End) */}
        {destinationPlace && (
          <CircleMarker
            center={[destinationPlace.lat, destinationPlace.lng]}
            radius={9}
            pathOptions={{
              color: "#FFFFFF",
              fillColor: "#EF4444",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent={false}>
              <div className="text-xs p-1 font-sans">
                <span className="font-bold text-rose-700 block">Destination</span>
                <span className="text-slate-900 font-semibold">{destinationPlace.name}</span>
              </div>
            </Tooltip>
          </CircleMarker>
        )}

        {/* Searched Landmark Marker */}
        {searchedPlace && (
          <CircleMarker
            center={[searchedPlace.lat, searchedPlace.lng]}
            radius={11}
            pathOptions={{
              color: "#0B1220",
              fillColor: "#38BDF8",
              fillOpacity: 0.95,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent={true}>
              <div className="text-xs p-1.5 font-sans min-w-[160px]">
                <div className="font-bold text-cyan-800 flex items-center justify-between">
                  <span>Searched Location</span>
                </div>
                <div className="font-semibold text-slate-900 mt-0.5">{searchedPlace.name}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{searchedPlace.displayName}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  {onSetSearchedPlaceAsOrigin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetSearchedPlaceAsOrigin(searchedPlace);
                      }}
                      className="text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded shadow"
                    >
                      Set Origin
                    </button>
                  )}
                  {onSetSearchedPlaceAsDestination && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetSearchedPlaceAsDestination(searchedPlace);
                      }}
                      className="text-[9px] bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-0.5 rounded shadow"
                    >
                      Set Dest
                    </button>
                  )}
                  {onClearSearchedPlace && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearSearchedPlace();
                      }}
                      className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
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
                    click: (e) => {
                      if (!isPickingOnMap) {
                        onSelectZone(zone);
                      }
                    },
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
                    click: (e) => {
                      if (!isPickingOnMap) {
                        onSelectZone(zone);
                      }
                    },
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
                    if (!isPickingOnMap) {
                      onSelectZone(matchedZone);
                      if (onSelectHotspot) onSelectHotspot(spot.zone_id);
                    }
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
