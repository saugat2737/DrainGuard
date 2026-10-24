"use client";

import React, { useState } from "react";
import {
  CloudRain,
  RotateCcw,
  Loader2,
  X,
  Calendar,
  AlertCircle,
  Info,
} from "lucide-react";
import { HourlyForecastItem } from "@/lib/weather";

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRain: number;
  forecastRain: number;
  peakHour: string;
  isWeatherLoading: boolean;
  isUpdatingRisk: boolean;
  onRainChange: (value: number) => void;
  onReset: () => void;
  timeline?: HourlyForecastItem[];
}

export function WeatherModal({
  isOpen,
  onClose,
  currentRain,
  forecastRain,
  peakHour,
  isWeatherLoading,
  isUpdatingRisk,
  onRainChange,
  onReset,
  timeline = [],
}: WeatherModalProps) {
  if (!isOpen) return null;

  const isSimulated = Math.abs(currentRain - forecastRain) > 0.1;

  const formatTimelineHour = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#142235] border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Rainfall & Weather Forecast</h3>
              <p className="text-[11px] text-slate-400">Open-Meteo forecast + flood simulation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="Close weather modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Weather Forecast Summary */}
        <div className="p-3.5 rounded-xl bg-[#0B1220] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">3-Hour Expected Rainfall:</span>
            {isWeatherLoading ? (
              <span className="flex items-center gap-1 text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> Syncing...
              </span>
            ) : (
              <span className="font-bold text-cyan-400 tabular-nums">
                {forecastRain} mm
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Expected Peak Intensity:</span>
            <span className="text-slate-200 font-semibold">{peakHour || "None"}</span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Forecast rainfall applies to the Tumakuru municipal region. It is a meteorological expectation and not a measurement of street water depth.
            </span>
          </div>

          {/* Hourly Timeline */}
          {timeline.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Next 6 Hours Outlook
              </div>
              <div className="grid grid-cols-6 gap-1 text-center">
                {timeline.map((slot, idx) => (
                  <div key={idx} className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="block text-[9px] text-slate-400 font-medium">
                      {formatTimelineHour(slot.time)}
                    </span>
                    <span className="block text-xs font-bold text-cyan-300 tabular-nums mt-0.5">
                      {slot.rain_mm}
                    </span>
                    <span className="block text-[8px] text-slate-500">mm</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rain Simulator Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Rainfall Simulator</span>
              <span className="text-[11px] text-slate-400">
                Test how road drainage responds to heavy showers
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isUpdatingRisk && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />}
              <span className="text-base font-bold tabular-nums text-white bg-[#0B1220] px-2.5 py-0.5 rounded-lg border border-slate-800">
                {Math.round(currentRain)} <span className="text-xs text-slate-400">mm</span>
              </span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="120"
            step="1"
            value={currentRain}
            onChange={(e) => onRainChange(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#20D6C2] focus:outline-none"
            aria-label="Simulation rainfall slider (0 to 120 mm)"
          />

          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0 mm (Dry)</span>
            <span>30 mm (Moderate)</span>
            <span>60 mm (Heavy)</span>
            <span>120 mm (Extreme)</span>
          </div>
        </div>

        {/* Simulation Notice & Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-[11px] text-slate-400">
            {isSimulated ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Simulation active (test mode)
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">✓ Using live Open-Meteo forecast</span>
            )}
          </div>

          {isSimulated && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-[#20D6C2] font-semibold transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Live Forecast
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
