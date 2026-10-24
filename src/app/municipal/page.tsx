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
  CheckCircle2,
  Clock,
  ChevronRight,
  Droplets,
} from "lucide-react";
import { RiskLevel } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

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
  const { resolvedTheme } = useTheme();
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
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "medium":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "high":
        return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
      case "severe":
        return "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40";
    }
  };

  const selectedZoneReports = reports.filter((r) => r.zone_id === selectedZoneId);
  const selectedZoneItem = inspections.find((i) => i.zone_id === selectedZoneId);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--dg-page-bg)] text-[var(--dg-text)] transition-colors">
      {/* Top Header */}
      <header className="h-14 sm:h-16 border-b border-[var(--dg-border)] bg-[var(--dg-surface-card)] backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-xs font-semibold text-[var(--dg-text)] transition touch-target"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Commuter Map</span>
          </Link>
          <div className="h-4 w-[1px] bg-[var(--dg-border)] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-wider uppercase text-cyan-600 dark:text-cyan-400">
              Municipal Operations Console
            </span>
            <span className="text-[10px] bg-slate-500/10 text-[var(--dg-text-secondary)] border border-[var(--dg-border)] px-1.5 py-0.5 rounded font-mono hidden sm:inline">
              Tumakuru City Corporation (TCC)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh button */}
          <button
            onClick={() => fetchInspectionsAndReports(rainMm)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] transition touch-target"
            title="Refresh Inspection Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Operations Container */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Ranked Backlog Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-colors">
            {/* Header with quick stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--dg-border-subtle)] pb-3">
              <div>
                <h1 className="text-base font-bold text-[var(--dg-text)]">
                  Catchment Clearance Priority Queue
                </h1>
                <p className="text-xs text-[var(--dg-text-secondary)]">
                  Ranked by live waterlogging risk score DESC → open reports DESC
                </p>
              </div>

              {/* Rain simulation pill */}
              <div className="flex items-center gap-2 bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] px-3 py-1.5 rounded-xl text-xs">
                <Droplets className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className="text-[var(--dg-text-secondary)] font-medium">Simulation Rain:</span>
                <span className="font-bold text-[var(--dg-text)] tabular-nums">{Math.round(rainMm)} mm</span>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Backlog Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--dg-border-subtle)] text-[var(--dg-text-muted)] font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Priority #</th>
                    <th className="py-2.5 px-3">Catchment / Ward</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Open Reports</th>
                    <th className="py-2.5 px-3">Primary Factor</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--dg-border-subtle)]">
                  {isLoading && inspections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--dg-text-muted)]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-500 mb-2" />
                        Evaluating drainage catchments...
                      </td>
                    </tr>
                  ) : inspections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--dg-text-muted)]">
                        No inspection catchments found.
                      </td>
                    </tr>
                  ) : (
                    inspections.map((item, idx) => {
                      const isSelected = item.zone_id === selectedZoneId;

                      return (
                        <tr
                          key={item.zone_id}
                          onClick={() => setSelectedZoneId(item.zone_id)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? "bg-cyan-500/10 border-l-4 border-l-cyan-500"
                              : "hover:bg-[var(--dg-surface-hover)]"
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-[var(--dg-text)]">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-[var(--dg-text)] block truncate max-w-[180px]">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                              {item.zone_id}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLevelBadge(
                                item.level
                              )}`}
                            >
                              {item.score}/100
                            </span>
                          </td>
                          <td className="py-3 px-3 tabular-nums font-semibold text-[var(--dg-text)]">
                            {item.open_reports}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-[var(--dg-text-secondary)] truncate max-w-[150px]">
                            {item.top_reason}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <ChevronRight className="w-4 h-4 inline text-[var(--dg-text-muted)]" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Detailed Catchment Drawer & Reports */}
        <div className="bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-colors">
          {selectedZoneItem ? (
            <div className="space-y-4">
              <div className="border-b border-[var(--dg-border-subtle)] pb-3">
                <span className="text-[10px] font-mono uppercase text-cyan-600 dark:text-cyan-400 font-bold block">
                  Catchment Detail: {selectedZoneItem.zone_id}
                </span>
                <h2 className="text-base font-bold text-[var(--dg-text)] mt-0.5">
                  {selectedZoneItem.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getLevelBadge(
                      selectedZoneItem.level
                    )}`}
                  >
                    Risk Score: {selectedZoneItem.score}/100
                  </span>
                  <span className="text-xs text-[var(--dg-text-muted)]">
                    Peak Forecast: {selectedZoneItem.score_at_forecast_peak}/100
                  </span>
                </div>
              </div>

              {/* Citizen Reports List for this Zone */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--dg-text-secondary)] uppercase tracking-wider block">
                  Citizen Incident Reports ({selectedZoneReports.length})
                </span>

                {selectedZoneReports.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[var(--dg-surface-muted)] border border-[var(--dg-border)] text-xs text-[var(--dg-text-muted)] text-center">
                    No citizen reports logged in this catchment yet.
                  </div>
                ) : (
                  selectedZoneReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 rounded-xl bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--dg-text)] capitalize flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              report.status === "open"
                                ? "bg-rose-500"
                                : report.status === "assigned"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          {report.blockage_type} (Severity {report.severity})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            report.status === "open"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30"
                              : report.status === "assigned"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <p className="text-[var(--dg-text-secondary)] text-[11px] leading-snug">{report.summary}</p>

                      {/* State transition buttons */}
                      <div className="pt-2 border-t border-[var(--dg-border-subtle)] flex items-center gap-2">
                        {report.status === "open" && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, "assigned")}
                            disabled={isUpdatingStatus === report.id}
                            className="flex-1 py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] transition flex items-center justify-center gap-1"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Assign Crew</span>
                          </button>
                        )}
                        {report.status !== "cleared" && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, "cleared")}
                            disabled={isUpdatingStatus === report.id}
                            className="flex-1 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Cleared</span>
                          </button>
                        )}
                        {report.status === "cleared" && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
            <div className="py-20 text-center text-[var(--dg-text-muted)] text-xs">
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
        <div className="min-h-screen bg-[var(--dg-page-bg)] flex items-center justify-center text-[var(--dg-text-muted)] text-xs font-semibold">
          Loading Municipal Operations...
        </div>
      }
    >
      <MunicipalDashboardContent />
    </Suspense>
  );
}
