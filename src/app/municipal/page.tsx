"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { RiskLevel } from "@/lib/types";

interface InspectionItem {
  zone_id: string;
  name: string;
  score: number;
  level: RiskLevel;
  score_at_forecast_peak: number;
  open_reports: number;
  top_reason: string;
}

function MunicipalDashboardContent() {
  const searchParams = useSearchParams();
  const initialRainParam = searchParams.get("rain_mm");
  const parsedInitialRain = initialRainParam ? parseFloat(initialRainParam) : 0;

  const [rainMm, setRainMm] = useState<number>(
    !isNaN(parsedInitialRain) ? parsedInitialRain : 0
  );
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInspections = useCallback(async (rainVal: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/inspections?rain_mm=${rainVal}`);
      if (!res.ok) throw new Error("Failed to load municipal inspection backlog.");
      const json = await res.json();
      if (json.data) {
        setInspections(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load inspection backlog."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections(rainMm);
  }, [fetchInspections, rainMm]);

  // Derived Summary Metrics
  const totalMonitoredZones = inspections.length;
  const highOrSevereCount = inspections.filter(
    (i) => i.level === "high" || i.level === "severe"
  ).length;
  const totalOpenReports = inspections.reduce(
    (sum, i) => sum + i.open_reports,
    0
  );
  const topPriorityZone = inspections[0] || null;

  const getLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30";
      case "medium":
        return "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30";
      case "high":
        return "bg-[#FB7185]/15 text-[#FB7185] border-[#FB7185]/30";
      case "severe":
        return "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#F8FAFC]">
      {/* Municipal Top Command Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0B1220]/95 backdrop-blur px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-[#142235] border border-slate-700/80 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Citizen Map</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <Image
              src="/assets/drainguard-logo-dark.svg"
              alt="DrainGuard"
              width={120}
              height={24}
              className="h-6 w-auto object-contain"
            />
            <span className="font-semibold text-xs tracking-wider uppercase text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-950/40">
              Municipal Operations Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
            Simulated demo data
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Tumakuru Municipal Corporation
          </span>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Operational Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-[#142235]/90 border border-slate-700/60 p-4 rounded-xl shadow-lg space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Monitored Zones
            </span>
            <span className="text-2xl font-black text-white tabular-nums">
              {totalMonitoredZones}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Centroid: Tumakuru Urban
            </span>
          </div>

          <div className="bg-[#142235]/90 border border-slate-700/60 p-4 rounded-xl shadow-lg space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Elevated / Severe
            </span>
            <span className="text-2xl font-black text-[#FB7185] tabular-nums">
              {highOrSevereCount}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Score ≥ 60/100 threshold
            </span>
          </div>

          <div className="bg-[#142235]/90 border border-slate-700/60 p-4 rounded-xl shadow-lg space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Open Blockage Reports
            </span>
            <span className="text-2xl font-black text-[#F5B942] tabular-nums">
              {totalOpenReports}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Verified active field alerts
            </span>
          </div>

          <div className="bg-[#142235]/90 border border-slate-700/60 p-4 rounded-xl shadow-lg space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Top Priority Zone
            </span>
            <span className="text-base font-bold text-[#38BDF8] truncate block">
              {topPriorityZone ? topPriorityZone.name : "N/A"}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {topPriorityZone
                ? `Score ${topPriorityZone.score} (${topPriorityZone.open_reports} open alerts)`
                : ""}
            </span>
          </div>
        </div>

        {/* Action / Sync Banner */}
        <div className="bg-[#142235]/80 border border-slate-700/60 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block">
                Synchronized Simulation Rainfall: {Math.round(rainMm)} mm
              </span>
              <span className="text-xs text-slate-400">
                Inspection backlog re-ranks live as rainfall increases.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="120"
              value={rainMm}
              onChange={(e) => setRainMm(parseFloat(e.target.value))}
              className="w-36 md:w-48 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#20D6C2]"
            />
            <button
              onClick={() => fetchInspections(rainMm)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Ranked Queue Table */}
        <div className="bg-[#142235]/95 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0B1220]/60">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Ranked Drain Clearance Queue
              </h2>
              <p className="text-xs text-slate-400">
                Sorted by Current Risk Score (DESC) → Open Reports (DESC) → Zone ID
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              {inspections.length} Total Targets
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8]" />
              <span className="text-xs font-medium">Re-ranking municipal inspection backlog...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-8 text-center text-rose-400 text-xs flex flex-col items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/40">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Zone Identifier</th>
                    <th className="py-3 px-4">Current Score</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Forecast Peak</th>
                    <th className="py-3 px-4">Open Reports</th>
                    <th className="py-3 px-4">Dominant Rationale</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {inspections.map((item, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr
                        key={item.zone_id}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">
                          #{rank}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block">
                            {item.name}
                          </span>
                          <span className="font-mono text-[10px] text-cyan-400">
                            {item.zone_id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-black text-white tabular-nums">
                            {item.score}
                          </span>
                          <span className="text-[10px] text-slate-500">/100</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getLevelBadge(
                              item.level
                            )}`}
                          >
                            {item.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-slate-300">
                          {item.score_at_forecast_peak}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {item.open_reports} active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {item.top_reason}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/?rain_mm=${Math.round(rainMm)}`}
                            className="text-xs text-[#38BDF8] hover:underline font-medium"
                          >
                            Inspect Map →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function MunicipalDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8]" />
        </div>
      }
    >
      <MunicipalDashboardContent />
    </Suspense>
  );
}
