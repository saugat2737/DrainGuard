"use client";

import React, { useState } from "react";
import {
  Navigation,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Sliders,
  Scale,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  Car,
  CloudRain,
  History,
  CheckCircle2,
} from "lucide-react";
import { ScoredRoute, RouteComparisonResult, HazardHotspot, RouteEvidenceCheck } from "@/lib/routing";

interface JourneyPlannerProps {
  currentRain: number;
  isSimulated: boolean;
  onRoutesCalculated: (result: RouteComparisonResult | null) => void;
  onSelectRouteDisplay: (type: "fastest" | "safest" | "balanced") => void;
  activeDisplayRoute: "fastest" | "safest" | "balanced";
  onSelectHotspot?: (zoneId: string) => void;
  onOpenStatusDrawer?: () => void;
}

export const PRESET_LOCATIONS = [
  { name: "Tumakuru Railway Station", lat: 13.3465, lng: 77.1215, desc: "North-East Transit Hub" },
  { name: "Siddaganga Extension", lat: 13.3290, lng: 77.1080, desc: "South-West Residential Catchment" },
  { name: "Amanikere North Entrance", lat: 13.3440, lng: 77.1140, desc: "Lake Shore Basin Corridor" },
  { name: "Gubbi Gate Market", lat: 13.3370, lng: 77.1020, desc: "Commercial Low-Lying Underpass" },
];

export function JourneyPlanner({
  currentRain,
  isSimulated,
  onRoutesCalculated,
  onSelectRouteDisplay,
  activeDisplayRoute,
  onSelectHotspot,
  onOpenStatusDrawer,
}: JourneyPlannerProps) {
  const [originIndex, setOriginIndex] = useState(0);
  const [destIndex, setDestIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteComparisonResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

  const handleComputeRoute = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const origin = PRESET_LOCATIONS[originIndex];
    const destination = PRESET_LOCATIONS[destIndex];

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          rain_mm: currentRain,
          is_simulated: isSimulated,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Routing service temporarily unavailable. Please try again.");
      }

      setRouteResult(json.data);
      onRoutesCalculated(json.data);
      onSelectRouteDisplay(json.data.recommendation || "safest");
      setIsDetailsExpanded(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to compute route options. Please check your connection.";
      setErrorMessage(msg);
      setRouteResult(null);
      onRoutesCalculated(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setRouteResult(null);
    setErrorMessage(null);
    onRoutesCalculated(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const activeRouteData = routeResult
    ? activeDisplayRoute === "safest"
      ? routeResult.safest
      : activeDisplayRoute === "balanced" && routeResult.balanced
      ? routeResult.balanced
      : routeResult.fastest
    : null;

  const evidence = activeRouteData?.evidence_check;

  return (
    <div className="flex flex-col space-y-3">
      {/* Origin & Destination Bar */}
      <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <Navigation className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Plan a Rain-Safe Trip
              </h2>
              <p className="text-[10px] text-slate-400">
                Ground-truthed basins, open culverts & live rain
              </p>
            </div>
          </div>
          {routeResult && (
            <button
              onClick={handleClear}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-2 relative">
          {/* Origin */}
          <div className="flex items-center gap-2.5 bg-[#0B1220] border border-slate-800 focus-within:border-cyan-500/60 p-2.5 rounded-xl transition">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <div className="flex-1 min-w-0">
              <label htmlFor="origin-select" className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Starting Point
              </label>
              <select
                id="origin-select"
                value={originIndex}
                onChange={(e) => setOriginIndex(Number(e.target.value))}
                className="w-full bg-transparent text-white text-xs font-medium focus:outline-none truncate cursor-pointer pt-0.5"
              >
                {PRESET_LOCATIONS.map((loc, i) => (
                  <option key={loc.name} value={i} className="bg-[#0B1220] text-white">
                    {loc.name} ({loc.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination */}
          <div className="flex items-center gap-2.5 bg-[#0B1220] border border-slate-800 focus-within:border-cyan-500/60 p-2.5 rounded-xl transition">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <div className="flex-1 min-w-0">
              <label htmlFor="dest-select" className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Destination
              </label>
              <select
                id="dest-select"
                value={destIndex}
                onChange={(e) => setDestIndex(Number(e.target.value))}
                className="w-full bg-transparent text-white text-xs font-medium focus:outline-none truncate cursor-pointer pt-0.5"
              >
                {PRESET_LOCATIONS.map((loc, i) => (
                  <option key={loc.name} value={i} className="bg-[#0B1220] text-white">
                    {loc.name} ({loc.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleComputeRoute}
          disabled={isLoading || originIndex === destIndex}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#20D6C2] hover:opacity-95 text-[#0B1220] font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 disabled:opacity-50 touch-target"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0B1220]" />
              <span>Verifying 3-Check Hydrological Evidence...</span>
            </>
          ) : (
            <>
              <span>Find Safest Route</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Route Results & Preferences */}
      {routeResult && (
        <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
          {/* Header & Toggle */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Route Choices
              </span>
              <span className="text-[10px] text-slate-400">
                ({Math.round(currentRain)} mm rain expected)
              </span>
            </div>
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              aria-label={isDetailsExpanded ? "Collapse route details" : "Expand route details"}
            >
              {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* 3 Route Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. Fastest */}
            <div
              onClick={() => onSelectRouteDisplay("fastest")}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                activeDisplayRoute === "fastest"
                  ? "bg-slate-900 border-[#F59E0B] ring-1 ring-[#F59E0B] shadow-md shadow-amber-950/20"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#F59E0B]" /> Fastest
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {formatDistance(routeResult.fastest.distance_m)}
                </span>
              </div>
              <div className="my-1">
                <span className="text-base font-bold text-white tabular-nums">
                  {formatDuration(routeResult.fastest.duration_s)}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Flood Exposure:</span>
                <span
                  className={`font-bold tabular-nums ${
                    routeResult.fastest.risk_score >= 60
                      ? "text-[#EF4444]"
                      : routeResult.fastest.risk_score >= 30
                      ? "text-[#F59E0B]"
                      : "text-[#22C55E]"
                  }`}
                >
                  {routeResult.fastest.risk_score}/100
                </span>
              </div>
            </div>

            {/* 2. Rain-Safer */}
            <div
              onClick={() => onSelectRouteDisplay("safest")}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                activeDisplayRoute === "safest"
                  ? "bg-slate-900 border-[#20D6C2] ring-1 ring-[#20D6C2] shadow-md shadow-teal-950/20"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#20D6C2] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Lower Hazard
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {formatDistance(routeResult.safest.distance_m)}
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-white tabular-nums">
                  {formatDuration(routeResult.safest.duration_s)}
                </span>
                {(routeResult.safest.delay_vs_fastest_s || 0) > 0 && (
                  <span className="text-[10px] text-amber-400 font-medium">
                    +{Math.round((routeResult.safest.delay_vs_fastest_s || 0) / 60)}m
                  </span>
                )}
              </div>
              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Flood Exposure:</span>
                <span className="font-bold text-[#22C55E] tabular-nums">
                  {routeResult.safest.risk_score}/100
                </span>
              </div>
            </div>

            {/* 3. Balanced */}
            <div
              onClick={() => onSelectRouteDisplay("balanced")}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                activeDisplayRoute === "balanced"
                  ? "bg-slate-900 border-[#38BDF8] ring-1 ring-[#38BDF8] shadow-md shadow-cyan-950/20"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Scale className="w-3 h-3 text-[#38BDF8]" /> Balanced
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {formatDistance((routeResult.balanced || routeResult.safest).distance_m)}
                </span>
              </div>
              <div className="my-1">
                <span className="text-base font-bold text-white tabular-nums">
                  {formatDuration((routeResult.balanced || routeResult.safest).duration_s)}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Flood Exposure:</span>
                <span className="font-bold text-cyan-400 tabular-nums">
                  {(routeResult.balanced || routeResult.safest).risk_score}/100
                </span>
              </div>
            </div>
          </div>

          {/* 3-Check Geospatial Evidence Summary */}
          {isDetailsExpanded && evidence && (
            <div className="p-3 rounded-xl bg-[#0B1220] border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                3-Check Evidence Audit for this Route
              </span>

              {/* Check 1: Current & Forecast Rain */}
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5 text-[11px]">
                    <CloudRain className="w-3.5 h-3.5" /> Check A: Current & Forecast Rain
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold tabular-nums">
                    {evidence.current_forecast_rain.rain_mm} mm / 3h
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Source: {evidence.current_forecast_rain.source} ({evidence.current_forecast_rain.resolution}). Regional forecast, not street water depth.
                </p>
              </div>

              {/* Check 2: Antecedent & Historical Incidents */}
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-400 flex items-center gap-1.5 text-[11px]">
                    <History className="w-3.5 h-3.5" /> Check B: Previous Rain & Topography
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold tabular-nums">
                    Past 24h: {evidence.antecedent_and_history.past_24h_mm} mm
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {evidence.antecedent_and_history.historical_note}
                </p>
              </div>

              {/* Check 3: Free Traffic Policy */}
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5 text-[11px]">
                    <Car className="w-3.5 h-3.5" /> Check C: Routing & Traffic Feasibility
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Baseline Speeds
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {evidence.traffic_feasibility.note}
                </p>
              </div>
            </div>
          )}

          {/* Expanded Recommendation & Hotspot Details */}
          {isDetailsExpanded && activeRouteData && (
            <div className="space-y-2.5 pt-1">
              {/* Recommendation narrative */}
              <div className="p-2.5 rounded-xl bg-[#0B1220] border border-slate-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#38BDF8]">
                  <Info className="w-3.5 h-3.5" />
                  <span>Why This Route is Suggested</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {routeResult.reason}
                </p>
              </div>

              {/* Hazards along this route with geographic grounding */}
              {activeRouteData.hazard_hotspots && activeRouteData.hazard_hotspots.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-rose-300 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Known Hazard Corridors Along This Path
                    </span>
                    <span>{activeRouteData.hazard_hotspots.length} Choke Point(s)</span>
                  </div>
                  <div className="space-y-1">
                    {activeRouteData.hazard_hotspots.map((spot: HazardHotspot) => (
                      <button
                        key={spot.zone_id}
                        onClick={() => onSelectHotspot && onSelectHotspot(spot.zone_id)}
                        className="w-full text-left p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-[11px] text-slate-200 flex items-center justify-between transition"
                      >
                        <div>
                          <span className="font-semibold text-white block">{spot.zone_name}</span>
                          <span className="text-rose-400 text-[10px]">{spot.reason}</span>
                          {spot.geographic_justification && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {spot.geographic_justification}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-rose-300 tabular-nums shrink-0 ml-2">
                          {spot.risk_score}/100
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-emerald-950/25 border border-emerald-900/40 text-emerald-300 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>This route avoids all critical severe-risk waterlogging areas.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
