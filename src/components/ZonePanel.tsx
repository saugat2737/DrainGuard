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
  Compass,
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
      <div className="bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] rounded-2xl p-5 shadow-xl text-[var(--dg-text-secondary)] flex flex-col items-center text-center space-y-3 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] flex items-center justify-center text-cyan-500">
          <Layers className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="font-bold text-[var(--dg-text)] text-sm">Tap Any Zone to Inspect Evidence</h3>
          <p className="text-xs text-[var(--dg-text-muted)] leading-relaxed">
            Select a grounded flood basin or road culvert corridor on the map to review its hydrological justification, elevation factor, and citizen debris reports.
          </p>
        </div>
      </div>
    );
  }

  const { risk, name, id, elevation_factor, history_factor, basis, geographic_justification, approx_elevation_m } = selectedZone;

  const getLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return {
          bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          text: "Low Hazard",
          dot: "bg-emerald-500",
        };
      case "medium":
        return {
          bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          text: "Moderate Hazard",
          dot: "bg-amber-500",
        };
      case "high":
        return {
          bg: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
          text: "High Hazard",
          dot: "bg-orange-500",
        };
      case "severe":
        return {
          bg: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40",
          text: "Critical Hazard",
          dot: "bg-rose-500",
        };
    }
  };

  const badge = getLevelBadge(risk.level);

  const getFactorIcon = (key: string) => {
    switch (key) {
      case "rain":
        return <Droplets className="w-3.5 h-3.5 text-cyan-500" />;
      case "blockage":
        return <Trash2 className="w-3.5 h-3.5 text-amber-500" />;
      case "history":
        return <History className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />;
      case "elevation":
        return <Mountain className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[var(--dg-text-muted)]" />;
    }
  };

  return (
    <div className="bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] rounded-2xl p-4 shadow-xl text-[var(--dg-text)] space-y-3.5 transition-colors">
      {/* Zone Header */}
      <div className="space-y-1.5 border-b border-[var(--dg-border-subtle)] pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-wider uppercase text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
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
                className="text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] p-1 rounded hover:bg-[var(--dg-surface-hover)] transition"
                aria-label="Close zone inspection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <h3 className="text-base font-bold text-[var(--dg-text)] tracking-tight">{name}</h3>
      </div>

      {/* Main Score Hero Card */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)]">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[var(--dg-text-muted)] font-bold block">
            Calculated Exposure
          </span>
          <span className="text-xs text-[var(--dg-text-secondary)]">Rainfall: {Math.round(currentRain)} mm</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums text-[var(--dg-text)] flex items-baseline justify-end gap-1">
            <span>{risk.score}</span>
            <span className="text-xs font-normal text-[var(--dg-text-muted)]">/ 100</span>
          </div>
        </div>
      </div>

      {/* Geographic & Hydrological Grounding Basis */}
      {basis && (
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Geographic Grounding: {basis.replace(/_/g, " ")}</span>
          </div>
          <p className="text-[11px] text-[var(--dg-text-secondary)] leading-relaxed">
            {geographic_justification || "Ground-truthed corridor based on municipal waterbodies and terrain contours."}
          </p>
          {approx_elevation_m && (
            <span className="text-[10px] text-cyan-600 dark:text-cyan-300 font-mono block pt-0.5">
              Approx. Surface Elevation: ~{approx_elevation_m}m MSL
            </span>
          )}
        </div>
      )}

      {/* Narrative Explanation */}
      <div className="p-2.5 rounded-xl bg-[var(--dg-surface-muted)] border border-[var(--dg-border)] text-xs text-[var(--dg-text-secondary)] leading-relaxed">
        {risk.explanation}
      </div>

      {/* Contributing Factors breakdown */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--dg-text-muted)] block">
          Formula Weight Breakdown
        </span>
        <div className="space-y-1">
          {risk.factors.map((factor) => (
            <div
              key={factor.key}
              className="flex items-center justify-between p-1.5 rounded-lg bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] text-xs"
            >
              <div className="flex items-center gap-2">
                {getFactorIcon(factor.key)}
                <span className="text-[var(--dg-text)] capitalize font-medium text-[11px]">
                  {factor.key} ({Math.round(factor.weight * 100)}%)
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-[var(--dg-text)] tabular-nums text-[11px]">
                  {factor.contribution.toFixed(1)} pts
                </span>
                <span className="text-[10px] text-[var(--dg-text-muted)] ml-1">
                  ({Math.round(factor.value * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Elevation & History metadata */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-[var(--dg-surface-muted)] border border-[var(--dg-border)]">
          <span className="text-[10px] text-[var(--dg-text-muted)] block">Depression Factor</span>
          <span className="font-bold text-[var(--dg-text)]">{Math.round(elevation_factor * 100)}%</span>
        </div>
        <div className="p-2 rounded-lg bg-[var(--dg-surface-muted)] border border-[var(--dg-border)]">
          <span className="text-[10px] text-[var(--dg-text-muted)] block">Historical Ponding Frequency</span>
          <span className="font-bold text-[var(--dg-text)]">{Math.round(history_factor * 100)}%</span>
        </div>
      </div>

      {/* CTA: Report Blockage in this specific zone */}
      {onOpenReportModal && (
        <button
          onClick={onOpenReportModal}
          className="w-full py-2 px-3 rounded-xl bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-xs font-semibold text-[var(--dg-text)] flex items-center justify-center gap-1.5 transition touch-target"
        >
          <PlusCircle className="w-3.5 h-3.5 text-cyan-500" />
          <span>Report Blocked Drain in {name}</span>
        </button>
      )}
    </div>
  );
}
