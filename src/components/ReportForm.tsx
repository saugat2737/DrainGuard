"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  UploadCloud,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Sparkles,
} from "lucide-react";
import { BlockageType, ReportSeverity, Zone } from "@/lib/types";
import { VisionAnalysisResult } from "@/lib/vision";

interface ReportFormProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onClose: () => void;
  onReportSubmitted: (updatedZoneId?: string | null) => void;
}

export function ReportForm({
  zones,
  selectedZone,
  onClose,
  onReportSubmitted,
}: ReportFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const initialLat = selectedZone?.geometry.type === "Polygon"
    ? selectedZone.geometry.coordinates[0][0][1]
    : selectedZone?.geometry.type === "LineString"
    ? selectedZone.geometry.coordinates[0][1]
    : 13.3392;

  const initialLng = selectedZone?.geometry.type === "Polygon"
    ? selectedZone.geometry.coordinates[0][0][0]
    : selectedZone?.geometry.type === "LineString"
    ? selectedZone.geometry.coordinates[0][0]
    : 77.1140;

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);

  const [blockageType, setBlockageType] = useState<BlockageType>("plastic");
  const [severity, setSeverity] = useState<ReportSeverity>(2);
  const [summary, setSummary] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image must be smaller than 5 MB.");
      return;
    }

    setPhotoFile(file);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Vision classification request failed.");
      const json = await res.json();
      if (json.data) {
        setAnalysisResult(json.data);
        setBlockageType(json.data.blockage_type);
        setSeverity(json.data.severity);
        setSummary(json.data.summary);
      }
    } catch {
      setAnalysisResult({
        blockage_type: "unknown",
        severity: 2,
        summary: "Automatic analysis unavailable; flagged for manual review.",
        fallback: true,
      });
      setBlockageType("unknown");
      setSeverity(2);
      setSummary("Automatic analysis unavailable; flagged for manual review.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || summary.trim() === "") {
      setErrorMessage("Please provide a brief description of the blockage.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        lat,
        lng,
        photo_url: photoPreview || null,
        blockage_type: blockageType,
        severity,
        summary,
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to submit report.");
      }

      setSuccessMessage(
        json.data?.matched_zone_id
          ? `Report saved and linked to Zone ${json.data.matched_zone_id}! Street risk recalibrated.`
          : "Report registered. Location is >200m from seeded zones; recorded for municipal survey."
      );

      setTimeout(() => {
        onReportSubmitted(json.data?.matched_zone_id);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to record blockage report."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-[var(--dg-backdrop)] backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl p-5 shadow-2xl text-[var(--dg-text)] space-y-4 max-h-[92vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--dg-border-subtle)]">
          <div>
            <h2 className="text-base font-bold text-[var(--dg-text)]">
              Report Blocked Drain or Culvert
            </h2>
            <p className="text-xs text-[var(--dg-text-secondary)]">
              Help calibrate flood risk in your ward with photo evidence
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--dg-surface-hover)] text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--dg-text-secondary)] block">
              Photo of Drain / Choke Point (Optional)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--dg-border)] hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[var(--dg-surface-input)] hover:bg-[var(--dg-surface-hover)] transition group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[var(--dg-text)]">
                  Click to capture or upload drain photo
                </span>
                <span className="text-[11px] text-[var(--dg-text-muted)] mt-0.5">
                  Gemini Vision automatically classifies debris & severity
                </span>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-[var(--dg-border)] bg-[var(--dg-surface-input)] p-2 flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-[var(--dg-border)]">
                  <Image
                    src={photoPreview}
                    alt="Blockage preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-semibold text-[var(--dg-text)] truncate block">
                    {photoFile?.name}
                  </span>
                  <span className="text-[11px] text-[var(--dg-text-muted)]">
                    {(photoFile?.size ? photoFile.size / 1024 : 0).toFixed(0)} KB
                  </span>
                  {isAnalyzing && (
                    <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold mt-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing photo with Gemini Vision...
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setAnalysisResult(null);
                  }}
                  className="p-1 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] text-[var(--dg-text-muted)] hover:text-[var(--dg-text)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* AI Analysis Preview Pill */}
          {analysisResult && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--dg-text)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  AI Classification Preview
                </span>
                {analysisResult.fallback ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    Fallback Rule Applied
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                    Gemini Vision Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--dg-text-secondary)] italic">
                &ldquo;{summary}&rdquo;
              </p>
            </div>
          )}

          {/* Classification & Severity Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--dg-text-muted)] block uppercase">
                Blockage Material
              </label>
              <select
                value={blockageType}
                onChange={(e) => setBlockageType(e.target.value as BlockageType)}
                className="w-full bg-[var(--dg-surface-input)] border border-[var(--dg-border)] rounded-lg p-2 text-xs text-[var(--dg-text)] focus:outline-none focus:border-cyan-500"
              >
                <option value="plastic">Plastic / Polythene</option>
                <option value="silt">Silt / Mud</option>
                <option value="debris">Debris / Branches</option>
                <option value="construction">Construction Rubble</option>
                <option value="none">None / Clear</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--dg-text-muted)] block uppercase">
                Blockage Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value) as ReportSeverity)}
                className="w-full bg-[var(--dg-surface-input)] border border-[var(--dg-border)] rounded-lg p-2 text-xs text-[var(--dg-text)] focus:outline-none focus:border-cyan-500"
              >
                <option value={1}>1 - Minor / Surface</option>
                <option value={2}>2 - Moderate / Constricted</option>
                <option value={3}>3 - Severe / Fully Choked</option>
              </select>
            </div>
          </div>

          {/* Description summary */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--dg-text-muted)] block uppercase">
              Field Summary / Observation
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Grate clogged with plastic containers near junction"
              className="w-full bg-[var(--dg-surface-input)] border border-[var(--dg-border)] rounded-lg p-2 text-xs text-[var(--dg-text)] placeholder-[var(--dg-text-muted)] focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Location details */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[var(--dg-surface-muted)] border border-[var(--dg-border)] text-xs">
            <div className="flex items-center justify-between text-[var(--dg-text)]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                Target Coordinates
              </span>
              <span className="font-mono text-[var(--dg-text-secondary)]">
                {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
              </span>
            </div>
            <p className="text-[11px] text-[var(--dg-text-muted)]">
              Linked automatically to nearest street zone within 200 metres.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isAnalyzing}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 touch-target"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Alert & Recalculating Risk...
                </>
              ) : (
                "Submit Citizen Report"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
