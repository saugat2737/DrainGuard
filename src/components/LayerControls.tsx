"use client";

import React, { useState } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  CloudRain,
  Sliders,
  RotateCcw,
  ShieldAlert,
  Car,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

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
}: LayerControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTrafficNotice, setShowTrafficNotice] = useState(false);

  return (
    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[450] flex flex-col items-end gap-2">
      {/* Quick Rain / Sim Capsule */}
      <div className="flex items-center gap-1.5 bg-[#0B1220]/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-lg text-xs">
        <button
          onClick={onOpenSliderModal}
          className="flex items-center gap-1.5 text-slate-200 hover:text-white transition"
          title="Adjust rainfall simulation"
        >
          <CloudRain className="w-4 h-4 text-[#38BDF8]" />
          <span className="font-semibold tabular-nums text-white">
            {Math.round(currentRain)} mm
          </span>
          {isSimulated ? (
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40">
              Sim
            </span>
          ) : (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              Live
            </span>
          )}
          <Sliders className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </button>

        {isSimulated && (
          <button
            onClick={onResetToForecast}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-[#20D6C2] transition"
            title={`Reset to live forecast (${forecastRain} mm)`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Layer Toggle Floating Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md shadow-xl text-xs font-semibold transition touch-target ${
            isOpen
              ? "bg-[#38BDF8] text-[#0B1220] border-[#38BDF8]"
              : "bg-[#0B1220]/90 text-slate-200 hover:text-white border-slate-700/80"
          }`}
          aria-label="Map layer controls"
          aria-expanded={isOpen}
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Layers</span>
        </button>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-[#142235]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-bold text-white text-[11px] tracking-wider uppercase text-slate-400">
                Map Overlays
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>

            {/* Risk Zones Toggle */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#38BDF8]" />
                <div>
                  <div className="font-semibold text-white">Waterlogging Zones</div>
                  <div className="text-[10px] text-slate-400">10 Tumakuru corridors</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showRiskZones}
                onChange={(e) => setShowRiskZones(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
              />
            </label>

            {/* Reports / Hazards Toggle */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#F43F5E]" />
                <div>
                  <div className="font-semibold text-white">Hazard Hotspots</div>
                  <div className="text-[10px] text-slate-400">Citizen & route risks</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showReportsLayer}
                onChange={(e) => setShowReportsLayer(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-0"
              />
            </label>

            {/* Traffic Overlay (Honest state) */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vehicular Traffic</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold bg-slate-800 px-1.5 py-0.5 rounded">
                  Unavailable
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Live congestion telemetry requires a provider key (TomTom / HERE). OSRM estimates baseline speeds without live traffic.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
