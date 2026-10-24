"use client";

import React, { useState, useEffect } from "react";
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
  ArrowUpDown,
  Compass,
} from "lucide-react";
import { ScoredRoute, RouteComparisonResult, HazardHotspot, RouteEvidenceCheck } from "@/lib/routing";
import { GeocodePlace, TUMAKURU_FALLBACK_PRESETS } from "@/lib/geocoding";
import { PlaceAutocompleteInput } from "./PlaceAutocompleteInput";

interface JourneyPlannerProps {
  currentRain: number;
  isSimulated: boolean;
  onRoutesCalculated: (result: RouteComparisonResult | null) => void;
  onSelectRouteDisplay: (type: "fastest" | "safest" | "balanced") => void;
  activeDisplayRoute: "fastest" | "safest" | "balanced";
  onSelectHotspot?: (zoneId: string) => void;
  onOpenStatusDrawer?: () => void;
  // Map picking props
  onStartPickOnMap?: (target: "origin" | "destination") => void;
  activePickingTarget?: "origin" | "destination" | null;
  originPlace: GeocodePlace | null;
  destinationPlace: GeocodePlace | null;
  onChangeOrigin: (place: GeocodePlace | null) => void;
  onChangeDestination: (place: GeocodePlace | null) => void;
}

export function JourneyPlanner({
  currentRain,
  isSimulated,
  onRoutesCalculated,
  onSelectRouteDisplay,
  activeDisplayRoute,
  onSelectHotspot,
  onOpenStatusDrawer,
  onStartPickOnMap,
  activePickingTarget = null,
  originPlace,
  destinationPlace,
  onChangeOrigin,
  onChangeDestination,
}: JourneyPlannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteComparisonResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  // Clear routes if either point changes to null
  useEffect(() => {
    if (!originPlace || !destinationPlace) {
      setRouteResult(null);
      onRoutesCalculated(null);
    }
  }, [originPlace, destinationPlace, onRoutesCalculated]);

  const handleComputeRoute = async () => {
    if (!originPlace || !destinationPlace) {
      setErrorMessage("Please select both starting point and destination.");
      return;
    }

    if (
      Math.abs(originPlace.lat - destinationPlace.lat) < 0.0001 &&
      Math.abs(originPlace.lng - destinationPlace.lng) < 0.0001
    ) {
      setErrorMessage("Starting point and destination cannot be identical.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: originPlace.lat, lng: originPlace.lng },
          destination: { lat: destinationPlace.lat, lng: destinationPlace.lng },
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

  const handleSwap = () => {
    const temp = originPlace;
    onChangeOrigin(destinationPlace);
    onChangeDestination(temp);
    setRouteResult(null);
    onRoutesCalculated(null);
  };

  const handleClear = () => {
    onChangeOrigin(null);
    onChangeDestination(null);
    setRouteResult(null);
    setErrorMessage(null);
    onRoutesCalculated(null);
  };

  // Browser Geolocation for Origin
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const json = await res.json();
            if (json.data) {
              onChangeOrigin(json.data);
              setIsLocating(false);
              return;
            }
          }
        } catch {
          // Fall through
        }

        onChangeOrigin({
          id: `curr-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name: "My Current Location",
          displayName: `GPS Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
          lat,
          lng,
        });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage("Location access was denied. Please select a starting point manually.");
        } else if (err.code === err.TIMEOUT) {
          setErrorMessage("Location request timed out. Please try searching or picking on the map.");
        } else {
          setErrorMessage("Unable to determine current position. Please select manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
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
      {/* Origin & Destination Search Bar */}
      <div className="bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] rounded-2xl p-3 sm:p-4 shadow-xl space-y-3 text-[var(--dg-text)] transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--dg-border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
              <Navigation className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--dg-text)]">
                Plan a Rain-Safe Trip
              </h2>
              <p className="text-[10px] text-[var(--dg-text-secondary)]">
                Search landmarks or pick points directly on map
              </p>
            </div>
          </div>
          {(originPlace || destinationPlace || routeResult) && (
            <button
              onClick={handleClear}
              className="text-[11px] text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] transition"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Search Inputs with Autocomplete & Pick-on-Map */}
        <div className="space-y-2 relative">
          <div className="relative">
            <PlaceAutocompleteInput
              id="origin-input"
              label="Starting Point"
              placeholder="Search origin or landmark in Tumakuru..."
              value={originPlace}
              onChange={onChangeOrigin}
              onPickOnMap={() => onStartPickOnMap?.("origin")}
              isPickingOnMap={activePickingTarget === "origin"}
              accentColor="green"
            />
          </div>

          {/* Swap Button & Current Location Shortcut */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 py-0.5 transition"
            >
              {isLocating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Compass className="w-3 h-3" />
              )}
              <span>Use My Location</span>
            </button>

            <button
              type="button"
              onClick={handleSwap}
              disabled={!originPlace && !destinationPlace}
              title="Swap origin and destination"
              className="p-1 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] border border-[var(--dg-border)] transition flex items-center gap-1 text-[10px]"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span className="hidden sm:inline">Swap</span>
            </button>
          </div>

          <div className="relative">
            <PlaceAutocompleteInput
              id="dest-input"
              label="Destination"
              placeholder="Search destination or address..."
              value={destinationPlace}
              onChange={onChangeDestination}
              onPickOnMap={() => onStartPickOnMap?.("destination")}
              isPickingOnMap={activePickingTarget === "destination"}
              accentColor="red"
            />
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {!originPlace && !destinationPlace && (
          <div className="pt-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
              Popular Landmarks:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TUMAKURU_FALLBACK_PRESETS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChangeDestination(p)}
                  className="text-[10px] bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] px-2 py-1 rounded-lg border border-[var(--dg-border)] truncate transition"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleComputeRoute}
          disabled={isLoading || !originPlace || !destinationPlace}
          className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Street Topography & Rain...</span>
            </>
          ) : (
            <>
              <span>Find Rain-Safe Routes</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Comparison Cards (Fastest vs Safest vs Balanced) */}
      {routeResult && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              Route Comparisons
            </span>
            <span className="text-[10px] text-slate-400">
              Select one to view on map
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Safest / Rain-Safer Card */}
            <div
              onClick={() => onSelectRouteDisplay("safest")}
              className={`p-3 rounded-2xl cursor-pointer transition border relative ${
                activeDisplayRoute === "safest"
                  ? "bg-[var(--dg-surface-card)] border-cyan-400 shadow-[0_0_15px_rgba(32,214,194,0.15)] ring-1 ring-cyan-400"
                  : "bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-card)]/60 border-[var(--dg-border-subtle)]"
              }`}
            >
              {routeResult.recommendation === "safest" && (
                <span className="absolute -top-2 right-3 text-[9px] font-bold bg-[#20D6C2] text-slate-950 px-2 py-0.5 rounded-full shadow">
                  RECOMMENDED
                </span>
              )}
              <div className="flex items-center gap-1.5 text-[#20D6C2] text-xs font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Rain-Safer</span>
              </div>
              <div className="text-lg font-black text-white">
                {formatDuration(routeResult.safest.duration_s)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                <span>{formatDistance(routeResult.safest.distance_m)}</span>
                <span className="font-semibold text-emerald-400">
                  Risk {routeResult.safest.risk_score}/100
                </span>
              </div>
            </div>

            {/* Balanced Card */}
            {routeResult.balanced && (
              <div
                onClick={() => onSelectRouteDisplay("balanced")}
                className={`p-3 rounded-2xl cursor-pointer transition border relative ${
                  activeDisplayRoute === "balanced"
                    ? "bg-[var(--dg-surface-card)] border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400"
                    : "bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-card)]/60 border-[var(--dg-border-subtle)]"
                }`}
              >
                {routeResult.recommendation === "balanced" && (
                  <span className="absolute -top-2 right-3 text-[9px] font-bold bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full shadow">
                    BALANCED
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold mb-1">
                  <Scale className="w-4 h-4" />
                  <span>Balanced</span>
                </div>
                <div className="text-lg font-black text-white">
                  {formatDuration(routeResult.balanced.duration_s)}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                  <span>{formatDistance(routeResult.balanced.distance_m)}</span>
                  <span className="font-semibold text-cyan-400">
                    Risk {routeResult.balanced.risk_score}/100
                  </span>
                </div>
              </div>
            )}

            {/* Fastest Card */}
            <div
              onClick={() => onSelectRouteDisplay("fastest")}
              className={`p-3 rounded-2xl cursor-pointer transition border relative ${
                activeDisplayRoute === "fastest"
                  ? "bg-[var(--dg-surface-card)] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-400"
                  : "bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-card)]/60 border-[var(--dg-border-subtle)]"
              }`}
            >
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                <Zap className="w-4 h-4" />
                <span>Fastest</span>
              </div>
              <div className="text-lg font-black text-white">
                {formatDuration(routeResult.fastest.duration_s)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                <span>{formatDistance(routeResult.fastest.distance_m)}</span>
                <span className="font-semibold text-amber-400">
                  Risk {routeResult.fastest.risk_score}/100
                </span>
              </div>
            </div>
          </div>

          {/* 3-Check Geospatial Evidence Summary */}
          {isDetailsExpanded && evidence && (
            <div className="bg-[var(--dg-surface-card)]/95 border border-[var(--dg-border)] rounded-2xl p-3.5 shadow-xl space-y-2">
              <div className="flex items-center justify-between border-b border-[var(--dg-border-subtle)] pb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    3-Check Evidence Audit for this Route
                  </span>
                </div>
                <button
                  onClick={() => onOpenStatusDrawer && onOpenStatusDrawer()}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
                >
                  Inspect API Sources
                </button>
              </div>

              {/* Check 1: Forecast Precipitation */}
              <div className="p-2 rounded-lg bg-[var(--dg-surface-elevated)] border border-[var(--dg-border-subtle)]/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-400 flex items-center gap-1.5 text-[11px]">
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
              <div className="p-2 rounded-lg bg-[var(--dg-surface-elevated)] border border-[var(--dg-border-subtle)]/80 space-y-1">
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
              <div className="p-2 rounded-lg bg-[var(--dg-surface-elevated)] border border-[var(--dg-border-subtle)]/80 space-y-1">
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
              <div className="p-2.5 rounded-xl bg-[var(--dg-surface-input)] border border-[var(--dg-border-subtle)] text-xs space-y-1">
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
