"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";
import { Zone, ZoneRisk } from "@/lib/types";

interface MapWrapperProps {
  zones: (Zone & { risk: ZoneRisk })[];
  selectedZoneId: string | null;
  onSelectZone: (zone: Zone & { risk: ZoneRisk }) => void;
  center?: [number, number];
  zoom?: number;
}

// Client-only dynamic import with SSR disabled to prevent Leaflet window errors
const DynamicMapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] rounded-xl border border-slate-700/60 bg-[#0B1220] flex flex-col items-center justify-center text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8]" />
      <span className="text-xs font-medium">Initializing Tumakuru Spatial Cartography...</span>
    </div>
  ),
});

export function MapWrapper(props: MapWrapperProps) {
  return <DynamicMapView {...props} />;
}
