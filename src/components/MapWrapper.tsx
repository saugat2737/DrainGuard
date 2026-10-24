"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Zone, ZoneRisk } from "@/lib/types";
import { HazardHotspot } from "@/lib/routing";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[440px] bg-[#0B1220] flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800">
      <div className="w-9 h-9 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      <span className="text-xs font-medium tracking-wide text-slate-300">
        Loading Hydro Cartography...
      </span>
    </div>
  ),
});

interface MapWrapperProps {
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

export function MapWrapper(props: MapWrapperProps) {
  return <MapView {...props} />;
}
