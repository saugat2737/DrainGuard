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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-[var(--dg-backdrop)] backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl p-5 shadow-2xl text-[var(--dg-text)] space-y-4 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--dg-border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--dg-text)]">Rainfall & Weather Forecast</h3>
              <p className="text-[11px] text-[var(--dg-text-secondary)]">Open-Meteo forecast + flood simulation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--dg-surface-hover)] text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] transition"
            aria-label="Close weather modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Weather Forecast Summary */}
        <div className="p-3.5 rounded-xl bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--dg-text-secondary)] font-medium">3-Hour Expected Rainfall:</span>
            {isWeatherLoading ? (
              <span className="flex items-center gap-1 text-[var(--dg-text-muted)]">
                <Loader2 className="w-3 h-3 animate-spin text-cyan-500" /> Syncing...
              </span>
            ) : (
              <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                {forecastRain} mm
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--dg-text-secondary)] font-medium">Expected Peak Intensity:</span>
            <span className="text-[var(--dg-text)] font-semibold">{peakHour || "None"}</span>
          </div>

          <div className="p-2 rounded-lg bg-[var(--dg-surface-muted)] border border-[var(--dg-border-subtle)] text-[11px] text-[var(--dg-text-muted)] leading-relaxed flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
            <span>
              Forecast rainfall applies to the Tumakuru municipal region. It is a meteorological expectation and not a measurement of street water depth.
            </span>
          </div>

          {/* Hourly Timeline */}
          {timeline.length > 0 && (
            <div className="pt-2 border-t border-[var(--dg-border-subtle)]">
              <div className="text-[10px] uppercase font-bold text-[var(--dg-text-muted)] tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Next 6 Hours Outlook
              </div>
              <div className="grid grid-cols-6 gap-1 text-center">
                {timeline.map((slot, idx) => (
                  <div key={idx} className="bg-[var(--dg-surface-muted)] p-1.5 rounded-lg border border-[var(--dg-border-subtle)]">
                    <span className="block text-[9px] text-[var(--dg-text-muted)] font-medium">
                      {formatTimelineHour(slot.time)}
                    </span>
                    <span className="block text-xs font-bold text-cyan-600 dark:text-cyan-300 tabular-nums mt-0.5">
                      {slot.rain_mm}
                    </span>
                    <span className="block text-[8px] text-[var(--dg-text-muted)]">mm</span>
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
              <span className="text-xs font-bold text-[var(--dg-text)] block">Rainfall Simulator</span>
              <span className="text-[11px] text-[var(--dg-text-secondary)]">
                Test how road drainage responds to heavy showers
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isUpdatingRisk && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />}
              <span className="text-base font-bold tabular-nums text-[var(--dg-text)] bg-[var(--dg-surface-elevated)] px-2.5 py-0.5 rounded-lg border border-[var(--dg-border)]">
                {Math.round(currentRain)} <span className="text-xs text-[var(--dg-text-muted)]">mm</span>
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
            className="w-full h-2.5 bg-[var(--dg-surface-hover)] rounded-lg appearance-none cursor-pointer accent-[#20D6C2] focus:outline-none"
            aria-label="Simulation rainfall slider (0 to 120 mm)"
          />

          <div className="flex justify-between text-[11px] text-[var(--dg-text-muted)]">
            <span>0 mm (Dry)</span>
            <span>30 mm (Moderate)</span>
            <span>60 mm (Heavy)</span>
            <span>120 mm (Extreme)</span>
          </div>
        </div>

        {/* Simulation Notice & Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--dg-border-subtle)]">
          <div className="text-[11px] text-[var(--dg-text-muted)]">
            {isSimulated ? (
              <span className="text-amber-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Simulation active (test mode)
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Using live Open-Meteo forecast</span>
            )}
          </div>

          {isSimulated && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-xs text-teal-600 dark:text-[#20D6C2] font-semibold transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Live Forecast
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
