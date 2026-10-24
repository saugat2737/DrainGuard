import React from "react";
import { Zone, ZoneRisk, RiskLevel } from "@/lib/types";
import {
  Info,
  Layers,
  Droplets,
  Trash2,
  Mountain,
  History,
} from "lucide-react";

interface ZonePanelProps {
  selectedZone: (Zone & { risk: ZoneRisk }) | null;
  currentRain: number;
  onOpenReportModal?: () => void;
}

export function ZonePanel({ selectedZone, currentRain, onOpenReportModal }: ZonePanelProps) {
  if (!selectedZone) {
    return (
      <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/60 rounded-xl p-6 shadow-xl shadow-black/40 text-slate-300 h-full flex flex-col justify-center items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
          <Layers className="w-6 h-6 text-[#38BDF8]" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h3 className="font-semibold text-white text-base">Select a Street Zone</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click on any colored street or drainage corridor on the Tumakuru map to inspect its explainable risk score and contributing factors.
          </p>
        </div>
        <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#20D6C2]" />
          <span>Current simulation rainfall: {Math.round(currentRain)} mm</span>
        </div>
      </div>
    );
  }

  const { risk, name, id, elevation_factor, history_factor } = selectedZone;

  const getLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return {
          bg: "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30",
          text: "Low Risk",
          dot: "bg-[#34D399]",
        };
      case "medium":
        return {
          bg: "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30",
          text: "Medium Risk",
          dot: "bg-[#F5B942]",
        };
      case "high":
        return {
          bg: "bg-[#FB7185]/15 text-[#FB7185] border-[#FB7185]/30",
          text: "High Risk",
          dot: "bg-[#FB7185]",
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
    <div className="bg-[#142235]/95 backdrop-blur-md border border-slate-700/60 rounded-xl p-5 shadow-xl shadow-black/40 text-[#F8FAFC] flex flex-col justify-between space-y-5 overflow-y-auto max-h-full">
      {/* Zone Header */}
      <div className="space-y-2 border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono tracking-wider uppercase text-[#38BDF8] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
            {id}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.text}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">{name}</h2>
        <p className="text-xs text-slate-400">
          Simulated corridor · Tumakuru Municipal Smart City
        </p>
      </div>

      {/* Score gauge + Primary Metrics */}
      <div className="grid grid-cols-3 gap-2.5 bg-[#0B1220]/80 border border-slate-800 p-3 rounded-lg shadow-inner">
        <div className="text-center border-r border-slate-800 pr-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Risk Score
          </span>
          <span className="text-2xl font-black tabular-nums text-white">
            {risk.score}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </span>
        </div>
        <div className="text-center border-r border-slate-800 pr-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Elevation
          </span>
          <span className="text-base font-bold tabular-nums text-slate-200 mt-1 block">
            {Math.round(elevation_factor * 100)}%
          </span>
        </div>
        <div className="text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Flood History
          </span>
          <span className="text-base font-bold tabular-nums text-slate-200 mt-1 block">
            {Math.round(history_factor * 100)}%
          </span>
        </div>
      </div>

      {/* Plain Language Rationale */}
      <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Info className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Explainable Risk Rationale</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {risk.explanation}
        </p>
      </div>

      {/* Factor Breakdown Bars */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Contributing Risk Factors</span>
          <span className="text-[10px] text-slate-500 font-normal">Normalized & Weighted</span>
        </div>

        <div className="space-y-2">
          {risk.factors.map((factor) => {
            const percentage = Math.min(100, Math.round(factor.contribution));
            return (
              <div key={factor.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    {getFactorIcon(factor.key)}
                    <span className="capitalize">{factor.key}</span>
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {factor.text}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#38BDF8] to-[#20D6C2] rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(4, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Linked reports indicator & Report Action */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Linked Citizen Reports:</span>
          <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {risk.linked_report_ids.length} active
          </span>
        </div>

        {onOpenReportModal && (
          <button
            onClick={onOpenReportModal}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-teal-600/30 hover:from-cyan-600/40 hover:to-teal-600/40 border border-cyan-500/40 text-[#38BDF8] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <span>+ Report Blocked Drain Here</span>
          </button>
        )}
      </div>
    </div>
  );
}
