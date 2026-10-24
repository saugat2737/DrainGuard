"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  X,
  AlertCircle,
  RefreshCw,
  Cpu,
  Layers,
  CloudRain,
  Navigation,
  Car,
  Sparkles,
} from "lucide-react";
import { ServiceHealth, SystemStatusReport } from "@/lib/service-status";

interface ServiceStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceStatusDrawer({ isOpen, onClose }: ServiceStatusDrawerProps) {
  const [report, setReport] = useState<SystemStatusReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Failed to load service telemetry.");
      const json = await res.json();
      if (json.data) {
        setReport(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Service telemetry unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: ServiceHealth) => {
    switch (status) {
      case "available":
        return {
          bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          label: "Connected & Live",
          dot: "bg-emerald-500",
        };
      case "local":
        return {
          bg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          label: "Local Pure Engine",
          dot: "bg-cyan-500",
        };
      case "cached":
        return {
          bg: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
          label: "Cached Data",
          dot: "bg-blue-500",
        };
      case "demo":
        return {
          bg: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
          label: "Offline Demo Mode",
          dot: "bg-purple-500",
        };
      case "degraded":
        return {
          bg: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
          label: "Degraded / Partial",
          dot: "bg-amber-500",
        };
      case "unavailable":
      default:
        return {
          bg: "bg-slate-500/10 text-slate-500 border-slate-500/20",
          label: "Not Connected",
          dot: "bg-slate-400",
        };
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "weather":
        return <CloudRain className="w-4 h-4 text-cyan-500" />;
      case "routing":
        return <Navigation className="w-4 h-4 text-teal-500" />;
      case "traffic":
        return <Car className="w-4 h-4 text-amber-500" />;
      case "vision_ai":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "risk_engine":
        return <Cpu className="w-4 h-4 text-cyan-500" />;
      case "reports_store":
        return <Layers className="w-4 h-4 text-indigo-500" />;
      default:
        return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-[var(--dg-backdrop)] backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--dg-text)] transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-[var(--dg-border-subtle)] flex items-center justify-between bg-[var(--dg-surface-muted)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--dg-text)] text-sm">Data & Service Transparency</h3>
              <p className="text-[11px] text-[var(--dg-text-secondary)]">
                Audited telemetry of external APIs, live data, and local engines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] transition"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--dg-surface-hover)] text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] transition"
              aria-label="Close service status"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Plain Language Summary */}
          <div className="p-3 rounded-xl bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] text-xs text-[var(--dg-text-secondary)] leading-relaxed">
            <strong className="text-[var(--dg-text)] block mb-1">How DrainGuard Handles Data:</strong>
            DrainGuard uses live meteorological forecasts from Open-Meteo and OpenStreetMap road networks. We never fabricate live traffic or road water depth. If an upstream service is unconfigured or unavailable, DrainGuard runs on deterministic local logic so your trip planning never crashes.
          </div>

          {isLoading && !report ? (
            <div className="py-12 flex flex-col items-center justify-center text-[var(--dg-text-muted)] gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              <span className="text-xs">Verifying service integrations...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : report ? (
            <div className="space-y-2.5">
              {report.services.map((item) => {
                const badge = getStatusBadge(item.status);

                return (
                  <div
                    key={item.service}
                    className="p-3 rounded-xl bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[var(--dg-text)]">
                        {getServiceIcon(item.service)}
                        <span>{item.name}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--dg-text-secondary)] leading-relaxed">{item.message}</p>

                    <div className="pt-1 border-t border-[var(--dg-border-subtle)] flex flex-wrap items-center justify-between text-[10px] text-[var(--dg-text-muted)] gap-2">
                      <span className="truncate max-w-[320px]">
                        <strong>Source:</strong> {item.data_source}
                      </span>
                      {item.coverage_or_scope && (
                        <span>
                          <strong>Scope:</strong> {item.coverage_or_scope}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[var(--dg-border-subtle)] bg-[var(--dg-surface-muted)] flex items-center justify-between text-[11px] text-[var(--dg-text-muted)]">
          <span>Target City: Tumakuru, Karnataka</span>
          <span>Zero-Telemetry Leakage Architecture</span>
        </div>
      </div>
    </div>
  );
}
