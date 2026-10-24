import React from "react";
import { Zone, ZoneRisk, RiskLevel } from "@/lib/types";
import {
  Info,
  Layers,
  Droplets,
  Trash2,
  Mountain,
  History,
  X,
  PlusCircle,
} from "lucide-react";

interface ZonePanelProps {
  selectedZone: (Zone & { risk: ZoneRisk }) | null;
  currentRain: number;
  onOpenReportModal?: () => void;
  onClose?: () => void;
}

export function ZonePanel({
  selectedZone,
  currentRain,
  onOpenReportModal,
  onClose,
}: ZonePanelProps) {
  if (!selectedZone) {
    return (
      <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-5 shadow-xl text-slate-300 flex flex-col items-center text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-[#38BDF8]">
          <Layers className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="font-bold text-white text-sm">Tap Any Zone to Inspect Risk</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select a colored street polygon on the map to view its explainable flood factors, elevation basin score, and citizen blockage reports.
          </p>
        </div>
      </div>
    );
  }

  const { risk, name, id, elevation_factor, history_factor } = selectedZone;

  const getLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return {
          bg: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
          text: "Low Risk",
          dot: "bg-[#22C55E]",
        };
      case "medium":
        return {
          bg: "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30",
          text: "Medium Risk",
          dot: "bg-[#F5B942]",
        };
      case "high":
        return {
          bg: "bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30",
          text: "High Risk",
          dot: "bg-[#F97316]",
        };
      case "severe":
        return {
          bg: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40",
          text: "Severe Risk",
          dot: "bg-[#EF4444]",
        };
    }
  };

  const badge = getLevelBadge(risk.level);

  const getFactorIcon = (key: string) => {
    switch (key) {
      case "rain":
        return <Droplets className="w-3.5 h-3.5 text-[#38BDF8]" />;
      case "blockage":
        return <Trash2 className="w-3.5 h-3.5 text-[#F5B942]" />;
      case "history":
        return <History className="w-3.5 h-3.5 text-indigo-400" />;
      case "elevation":
        return <Mountain className="w-3.5 h-3.5 text-[#20D6C2]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-xl text-slate-100 space-y-3.5">
      {/* Zone Header */}
      <div className="space-y-1.5 border-b border-slate-800 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-wider uppercase text-[#38BDF8] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
            {id}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.text}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                aria-label="Close zone inspection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">{name}</h3>
      </div>

      {/* Main Score Hero Card */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1220] border border-slate-800">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Calculated Risk
          </span>
          <span className="text-xs text-slate-400">Rainfall: {Math.round(currentRain)} mm</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums text-white flex items-baseline justify-end gap-1">
            <span>{risk.score}</span>
            <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Narrative Explanation */}
      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
        {risk.explanation}
      </div>

      {/* Contributing Factors breakdown */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
          Formula Weight Breakdown
        </span>
        <div className="space-y-1">
          {risk.factors.map((factor) => (
            <div
              key={factor.key}
              className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1220]/80 border border-slate-800 text-xs"
            >
              <div className="flex items-center gap-2">
                {getFactorIcon(factor.key)}
                <span className="text-slate-300 capitalize font-medium text-[11px]">
                  {factor.key} ({Math.round(factor.weight * 100)}%)
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-white tabular-nums text-[11px]">
                  {factor.contribution.toFixed(1)} pts
                </span>
                <span className="text-[10px] text-slate-500 ml-1">
                  ({Math.round(factor.value * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Elevation & History metadata */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Depression / Inversion</span>
          <span className="font-bold text-white">{Math.round(elevation_factor * 100)}%</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Historical Ponding</span>
          <span className="font-bold text-white">{Math.round(history_factor * 100)}%</span>
        </div>
      </div>

      {/* CTA: Report Blockage in this specific zone */}
      {onOpenReportModal && (
        <button
          onClick={onOpenReportModal}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition touch-target"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Report Blocked Drain in {name}</span>
        </button>
      )}
    </div>
  );
}
