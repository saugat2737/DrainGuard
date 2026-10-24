import React from "react";
import { CloudRain, RotateCcw, Loader2 } from "lucide-react";

interface RainSliderProps {
  currentRain: number;
  forecastRain: number;
  peakHour: string;
  isWeatherLoading: boolean;
  isUpdatingRisk: boolean;
  onRainChange: (value: number) => void;
  onReset: () => void;
}

export function RainSlider({
  currentRain,
  forecastRain,
  peakHour,
  isWeatherLoading,
  isUpdatingRisk,
  onRainChange,
  onReset,
}: RainSliderProps) {
  const isSimulated = Math.abs(currentRain - forecastRain) > 0.1;

  return (
    <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/70 rounded-xl p-4 shadow-xl shadow-black/40 text-[#F8FAFC] space-y-3">
      {/* Top meteorological status chip */}
      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-[#38BDF8]" />
          <span className="font-medium text-slate-300">Live Forecast (Open-Meteo):</span>
          {isWeatherLoading ? (
            <span className="flex items-center gap-1 text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin text-[#38BDF8]" />
              Syncing...
            </span>
          ) : (
            <span className="font-semibold text-[#38BDF8] tabular-nums">
              {forecastRain} mm / 3h
              {peakHour && peakHour !== "N/A" ? ` (Peak: ${peakHour})` : ""}
            </span>
          )}
        </div>

        {isSimulated && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Reset slider to live forecast"
          >
            <RotateCcw className="w-3 h-3 text-[#20D6C2]" />
            Reset to Forecast
          </button>
        )}
      </div>

      {/* Simulator Control Header */}
      <div className="flex items-center justify-between">
        <label htmlFor="rain-slider" className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>Rainfall Simulator</span>
          {isSimulated ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-[#38BDF8] border border-cyan-500/30">
              Simulation Active
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
              Forecast Locked
            </span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {isUpdatingRisk && (
            <span className="flex items-center gap-1 text-[11px] text-[#20D6C2]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Recalculating...
            </span>
          )}
          <span className="text-base font-bold tabular-nums text-white bg-[#0B1220] px-2.5 py-0.5 rounded-lg border border-slate-700/80 shadow-inner">
            {Math.round(currentRain)} <span className="text-xs font-normal text-slate-400">mm</span>
          </span>
        </div>
      </div>

      {/* Range Input */}
      <div className="space-y-1.5">
        <input
          id="rain-slider"
          type="range"
          min="0"
          max="120"
          step="1"
          value={currentRain}
          onChange={(e) => onRainChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#20D6C2] focus:outline-none focus:ring-2 focus:ring-[#20D6C2]/40"
          aria-label="Simulated rainfall in millimeters (0 to 120 mm)"
        />

        <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-0.5">
          <span>0 mm (Dry)</span>
          <span className="text-slate-400">30 mm (Moderate)</span>
          <span className="text-slate-400">60 mm (Heavy)</span>
          <span>120 mm (Torrential)</span>
        </div>
      </div>
    </div>
  );
}
