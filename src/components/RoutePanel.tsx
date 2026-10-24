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
} from "lucide-react";
import { ScoredRoute, RouteComparisonResult } from "@/lib/routing";

interface RoutePanelProps {
  currentRain: number;
  onRoutesCalculated: (result: RouteComparisonResult | null) => void;
  onSelectRouteDisplay: (type: "fastest" | "safest") => void;
  activeDisplayRoute: "fastest" | "safest";
}

// Preset verified Tumakuru travel points for quick demo selection
const PRESET_LOCATIONS = [
  { name: "Tumakuru Railway Station", lat: 13.3465, lng: 77.1215 },
  { name: "Siddaganga Extension", lat: 13.3290, lng: 77.1080 },
  { name: "Amanikere North Entrance", lat: 13.3440, lng: 77.1140 },
  { name: "Gubbi Gate Market", lat: 13.3370, lng: 77.1020 },
];

export function RoutePanel({
  currentRain,
  onRoutesCalculated,
  onSelectRouteDisplay,
  activeDisplayRoute,
}: RoutePanelProps) {
  const [originIndex, setOriginIndex] = useState(0);
  const [destIndex, setDestIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteComparisonResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Routing service temporarily unavailable.");
      }

      setRouteResult(json.data);
      onRoutesCalculated(json.data);
      onSelectRouteDisplay(json.data.recommendation);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Routing computation failed.";
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

  return (
    <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl shadow-black/40 text-[#F8FAFC] space-y-3.5">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Safe Detour Navigation</h3>
            <p className="text-[11px] text-slate-400">
              Compare travel time vs. drainage flood risk
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

      {/* Origin & Destination Selectors */}
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="flex items-center gap-2 bg-[#0B1220]/80 border border-slate-800 p-2 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-[#34D399] shrink-0" />
          <span className="text-slate-400 font-medium shrink-0">From:</span>
          <select
            value={originIndex}
            onChange={(e) => setOriginIndex(Number(e.target.value))}
            className="w-full bg-transparent text-white font-medium focus:outline-none truncate"
          >
            {PRESET_LOCATIONS.map((loc, i) => (
              <option key={loc.name} value={i} className="bg-slate-900 text-white">
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-[#0B1220]/80 border border-slate-800 p-2 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0" />
          <span className="text-slate-400 font-medium shrink-0">To:</span>
          <select
            value={destIndex}
            onChange={(e) => setDestIndex(Number(e.target.value))}
            className="w-full bg-transparent text-white font-medium focus:outline-none truncate"
          >
            {PRESET_LOCATIONS.map((loc, i) => (
              <option key={loc.name} value={i} className="bg-slate-900 text-white">
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleComputeRoute}
        disabled={isLoading || originIndex === destIndex}
        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#38BDF8] to-[#20D6C2] hover:opacity-95 text-[#0B1220] font-bold text-xs uppercase tracking-wider transition shadow-md shadow-cyan-950 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Evaluating Flood Exposure on Routes...
          </>
        ) : (
          <>
            <span>Compute Safe Routes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Comparison Cards */}
      {routeResult && (
        <div className="space-y-2.5 pt-1">
          {/* Recommendation Banner */}
          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#38BDF8]">
              {routeResult.recommendation === "safest" ? (
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
              ) : (
                <Zap className="w-4 h-4 text-[#F5B942]" />
              )}
              <span>
                Recommendation: {routeResult.recommendation.toUpperCase()} ROUTE
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {routeResult.reason}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Fastest Option */}
            <div
              onClick={() => onSelectRouteDisplay("fastest")}
              className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                activeDisplayRoute === "fastest"
                  ? "bg-slate-900 border-[#38BDF8] ring-1 ring-[#38BDF8]"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                <span>Fastest</span>
                <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
              </div>
              <div className="my-1.5">
                <span className="text-lg font-bold text-white block tabular-nums">
                  {formatDuration(routeResult.fastest.duration_s)}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDistance(routeResult.fastest.distance_m)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Risk Score:</span>
                <span className="font-bold text-[#FB7185] tabular-nums">
                  {routeResult.fastest.risk_score}/100
                </span>
              </div>
            </div>

            {/* Safest Option */}
            <div
              onClick={() => onSelectRouteDisplay("safest")}
              className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                activeDisplayRoute === "safest"
                  ? "bg-slate-900 border-[#20D6C2] ring-1 ring-[#20D6C2]"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                <span>Safest</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              </div>
              <div className="my-1.5">
                <span className="text-lg font-bold text-white block tabular-nums">
                  {formatDuration(routeResult.safest.duration_s)}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDistance(routeResult.safest.distance_m)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Risk Score:</span>
                <span className="font-bold text-[#34D399] tabular-nums">
                  {routeResult.safest.risk_score}/100
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
