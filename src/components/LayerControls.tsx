"use client";

import React, { useState } from "react";
import {
  Layers,
  CloudRain,
  Sliders,
  RotateCcw,
  ShieldAlert,
  Car,
  AlertCircle,
  Server,
  Mountain,
  Compass,
} from "lucide-react";
import { BASEMAP_PROVIDERS } from "@/lib/basemaps";

interface LayerControlsProps {
  showRiskZones: boolean;
  setShowRiskZones: (val: boolean) => void;
  showReportsLayer: boolean;
  setShowReportsLayer: (val: boolean) => void;
  isSimulated: boolean;
  currentRain: number;
  forecastRain: number;
  onOpenSliderModal: () => void;
  onResetToForecast: () => void;
  onOpenStatusDrawer?: () => void;
  basemapId: "osm_streets" | "opentopo_terrain";
  setBasemapId: (id: "osm_streets" | "opentopo_terrain") => void;
}

export function LayerControls({
  showRiskZones,
  setShowRiskZones,
  showReportsLayer,
  setShowReportsLayer,
  isSimulated,
  currentRain,
  forecastRain,
  onOpenSliderModal,
  onResetToForecast,
  onOpenStatusDrawer,
  basemapId,
  setBasemapId,
}: LayerControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[450] flex flex-col items-end gap-2">
      {/* Quick Rain / Sim Capsule */}
      <div className="flex items-center gap-1.5 bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] px-2.5 py-1.5 rounded-xl shadow-lg text-xs transition-colors">
        <button
          onClick={onOpenSliderModal}
          className="flex items-center gap-1.5 text-[var(--dg-text)] hover:text-cyan-500 transition"
          title="Adjust rainfall simulation"
        >
          <CloudRain className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="font-semibold tabular-nums text-[var(--dg-text)]">
            {Math.round(currentRain)} mm
          </span>
          {isSimulated ? (
            <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
              Simulated
            </span>
          ) : (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              Live Forecast
            </span>
          )}
          <Sliders className="w-3.5 h-3.5 text-[var(--dg-text-muted)] ml-0.5" />
        </button>

        {isSimulated && (
          <button
            onClick={onResetToForecast}
            className="p-1 rounded hover:bg-[var(--dg-surface-hover)] text-[var(--dg-text-muted)] hover:text-teal-500 transition"
            title={`Reset to live forecast (${forecastRain} mm)`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Layer Toggle Floating Button & Status trigger */}
      <div className="flex items-center gap-2">
        {onOpenStatusDrawer && (
          <button
            onClick={onOpenStatusDrawer}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--dg-border)] bg-[var(--dg-surface-card)] text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] backdrop-blur-md shadow-xl text-xs font-semibold transition touch-target"
            title="Open Data & Services Transparency Status"
            aria-label="View service and data status"
          >
            <Server className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span className="hidden sm:inline">Data Status</span>
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md shadow-xl text-xs font-semibold transition touch-target ${
              isOpen
                ? "bg-cyan-500 text-white border-cyan-500"
                : "bg-[var(--dg-surface-card)] text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] border-[var(--dg-border)]"
            }`}
            aria-label="Map layer controls"
            aria-expanded={isOpen}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Layers</span>
          </button>

          {/* Dropdown Options */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] rounded-2xl p-3 shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-100 z-[600]">
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--dg-border-subtle)]">
                <span className="font-bold text-[11px] tracking-wider uppercase text-[var(--dg-text-muted)]">
                  Cartography & Overlays
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] text-xs px-1"
                >
                  ✕
                </button>
              </div>

              {/* Basemap Selection */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[var(--dg-text-muted)] block tracking-wider">
                  Basemap View
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setBasemapId("osm_streets")}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 ${
                      basemapId === "osm_streets"
                        ? "bg-cyan-500/15 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                        : "bg-[var(--dg-surface-elevated)] border-[var(--dg-border)] text-[var(--dg-text-secondary)] hover:border-slate-500"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">OSM Streets</span>
                  </button>
                  <button
                    onClick={() => setBasemapId("opentopo_terrain")}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 ${
                      basemapId === "opentopo_terrain"
                        ? "bg-teal-500/15 border-teal-500 text-teal-600 dark:text-teal-400 font-bold"
                        : "bg-[var(--dg-surface-elevated)] border-[var(--dg-border)] text-[var(--dg-text-secondary)] hover:border-slate-500"
                    }`}
                  >
                    <Mountain className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">OpenTopo Terrain</span>
                  </button>
                </div>
              </div>

              {/* Risk Zones Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-[var(--dg-surface-hover)] transition">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-500" />
                  <div>
                    <div className="font-semibold text-[var(--dg-text)]">Grounded Risk Corridors</div>
                    <div className="text-[10px] text-[var(--dg-text-muted)]">Basins, culverts & depressions</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showRiskZones}
                  onChange={(e) => setShowRiskZones(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-[var(--dg-surface-input)] border-[var(--dg-border)] focus:ring-0"
                />
              </label>

              {/* Reports / Hazards Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-[var(--dg-surface-hover)] transition">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#F43F5E]" />
                  <div>
                    <div className="font-semibold text-[var(--dg-text)]">Hazard Hotspots</div>
                    <div className="text-[10px] text-[var(--dg-text-muted)]">Citizen reports & choke points</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showReportsLayer}
                  onChange={(e) => setShowReportsLayer(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-500 bg-[var(--dg-surface-input)] border-[var(--dg-border)] focus:ring-0"
                />
              </label>

              {/* Free-Forever Traffic Policy Notice */}
              <div className="p-2 rounded-xl bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[var(--dg-text)] font-medium">
                    <Car className="w-3.5 h-3.5 text-[var(--dg-text-muted)]" />
                    <span>Live Vehicular Traffic</span>
                  </span>
                  <span className="text-[10px] text-[var(--dg-text-muted)] uppercase tracking-wider font-semibold bg-[var(--dg-surface-hover)] px-1.5 py-0.5 rounded">
                    Not Connected
                  </span>
                </div>
                <p className="text-[11px] text-[var(--dg-text-muted)] leading-snug">
                  Paid traffic APIs (Google/TomTom) are strictly prohibited under DrainGuard&apos;s zero-cost open architecture.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
