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
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Droplets,
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

interface ReportDetail {
  id: string;
  lat: number;
  lng: number;
  zone_id: string | null;
  photo_url: string | null;
  blockage_type: string;
  severity: number;
  summary: string;
  status: "open" | "assigned" | "cleared";
  source: string;
  created_at: string;
}

function MunicipalDashboardContent() {
  const searchParams = useSearchParams();
  const initialRainParam = searchParams.get("rain_mm");
  const parsedInitialRain = initialRainParam ? parseFloat(initialRainParam) : 0;

  const [rainMm, setRainMm] = useState<number>(
    !isNaN(parsedInitialRain) ? parsedInitialRain : 0
  );
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInspectionsAndReports = useCallback(async (rainVal: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [inspRes, repRes] = await Promise.all([
        fetch(`/api/inspections?rain_mm=${rainVal}`),
        fetch("/api/reports"),
      ]);

      if (!inspRes.ok) throw new Error("Failed to load municipal inspection backlog.");
      const inspJson = await inspRes.json();
      if (inspJson.data) {
        setInspections(inspJson.data);
        if (!selectedZoneId && inspJson.data.length > 0) {
          setSelectedZoneId(inspJson.data[0].zone_id);
        }
      }

      if (repRes.ok) {
        const repJson = await repRes.json();
        if (repJson.data) {
          setReports(repJson.data);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load inspection backlog."
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedZoneId]);

  useEffect(() => {
    fetchInspectionsAndReports(rainMm);
  }, [fetchInspectionsAndReports, rainMm]);

  // Handle report lifecycle mutation (open -> assigned -> cleared)
  const handleUpdateReportStatus = async (
    reportId: string,
    newStatus: "open" | "assigned" | "cleared"
  ) => {
    setIsUpdatingStatus(reportId);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId, status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update report status");

      // Refetch state
      await fetchInspectionsAndReports(rainMm);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to mutate status");
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30";
      case "medium":
        return "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30";
      case "high":
        return "bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30";
      case "severe":
        return "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40";
    }
  };

  const selectedZoneReports = reports.filter((r) => r.zone_id === selectedZoneId);
  const selectedZoneItem = inspections.find((i) => i.zone_id === selectedZoneId);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-slate-100">
      {/* Top Header */}
      <header className="h-14 sm:h-16 border-b border-slate-800/80 bg-[#0B1220]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#142235] hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition touch-target"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Commuter Map</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Image
              src="/assets/drainguard-logo-dark.svg"
              alt="DrainGuard"
              width={120}
              height={24}
              className="h-6 w-auto object-contain hidden sm:block"
            />
            <span className="font-bold text-[10px] tracking-wider uppercase text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-lg bg-cyan-950/40">
              Municipal Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-[#142235] px-2.5 py-1.5 rounded-xl border border-slate-700/80 text-xs">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-medium hidden xs:inline">Rain Context:</span>
            <span className="font-bold text-white tabular-nums">{Math.round(rainMm)} mm</span>
          </div>

          <button
            onClick={() => fetchInspectionsAndReports(rainMm)}
            className="p-2 rounded-xl bg-[#142235] hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition touch-target"
            title="Refresh Backlog"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Priority Inspection Queue (7 cols) */}
        <div className="lg:col-span-7 bg-[#142235]/95 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Priority Clearance Backlog</span>
              </h2>
              <p className="text-xs text-slate-400">
                Sorted by deterministic risk: <code className="text-slate-300">score DESC → open_reports DESC</code>
              </p>
            </div>
            <span className="text-xs text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60 font-semibold tabular-nums">
              {inspections.length} Zones
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-xs font-medium">Calculating municipal priority backlog...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
              {inspections.map((item, idx) => {
                const isSelected = item.zone_id === selectedZoneId;
                const badgeClass = getLevelBadge(item.level);

                return (
                  <div
                    key={item.zone_id}
                    onClick={() => setSelectedZoneId(item.zone_id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-slate-900 border-cyan-500 ring-1 ring-cyan-500 shadow-md shadow-cyan-950/30"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 tabular-nums shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{item.name}</span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                            {item.zone_id}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.top_reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-bold text-white tabular-nums">
                          {item.score} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                        </div>
                        <span className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold border ${badgeClass} uppercase`}>
                          {item.level}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Zone Inspection & Live Report Lifecycle (5 cols) */}
        <div className="lg:col-span-5 bg-[#142235]/95 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Zone Dispatch & Report Lifecycle</h2>
            <p className="text-xs text-slate-400">
              {selectedZoneItem ? selectedZoneItem.name : "Select a catchment"}
            </p>
          </div>

          {selectedZoneItem ? (
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#0B1220] border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Risk</span>
                  <span className="text-lg font-bold text-white tabular-nums">{selectedZoneItem.score}/100</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1220] border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Open Blockage Reports</span>
                  <span className="text-lg font-bold text-amber-400 tabular-nums">{selectedZoneItem.open_reports}</span>
                </div>
              </div>

              {/* Citizen Reports List for this Zone */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Citizen Incident Reports ({selectedZoneReports.length})
                </span>

                {selectedZoneReports.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                    No citizen reports logged in this catchment yet.
                  </div>
                ) : (
                  selectedZoneReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white capitalize flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              report.status === "open"
                                ? "bg-rose-500"
                                : report.status === "assigned"
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                          />
                          {report.blockage_type} (Severity {report.severity})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            report.status === "open"
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : report.status === "assigned"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <p className="text-slate-300 text-[11px] leading-snug">{report.summary}</p>

                      {/* State transition buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                        {report.status === "open" && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, "assigned")}
                            disabled={isUpdatingStatus === report.id}
                            className="flex-1 py-1 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition flex items-center justify-center gap-1"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Assign Crew</span>
                          </button>
                        )}
                        {report.status !== "cleared" && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, "cleared")}
                            disabled={isUpdatingStatus === report.id}
                            className="flex-1 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Cleared</span>
                          </button>
                        )}
                        {report.status === "cleared" && (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Clearance verified (0 weight)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              Select a catchment from the backlog to inspect reports.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function MunicipalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-slate-400 text-xs font-semibold">
          Loading Municipal Operations...
        </div>
      }
    >
      <MunicipalDashboardContent />
    </Suspense>
  );
}
