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

  // Default coordinate selection based on active zone or Tumakuru center
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

  // Editable fields after analysis
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

    // Trigger AI Vision Analysis automatically
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
      // Graceful fallback
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
      }, 1400);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Submission failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#142235] border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0B1220]/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Report Blocked Drain</h3>
              <p className="text-xs text-slate-400">
                Citizen flood alert · Tumakuru Municipal Operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[#34D399] text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Photo Upload Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              1. Drain Photograph (JPEG, PNG, WebP ≤ 5MB)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-900/60 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[130px] relative overflow-hidden"
            >
              {photoPreview ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden">
                  <Image
                    src={photoPreview}
                    alt="Uploaded drain preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition text-white text-xs font-medium">
                    Click to replace photograph
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-8 h-8 text-[#38BDF8] mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    Click to upload drain photo
                  </p>
                  <p className="text-[11px] text-slate-500">
                    AI automatically analyzes waste type & severity
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* AI Analysis Result Indicator */}
          {isAnalyzing && (
            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex items-center gap-2.5 text-xs text-cyan-300">
              <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
              <span>Gemini Vision inspecting photograph for plastic, silt, and debris...</span>
            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#20D6C2]" />
                  AI Classification Preview
                </span>
                {analysisResult.fallback ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-[#F5B942] border border-amber-500/25">
                    Fallback Rule Applied
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-[#38BDF8] border border-cyan-500/25">
                    Gemini Vision Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 italic">
                &ldquo;{summary}&rdquo;
              </p>
            </div>
          )}

          {/* Classification & Severity Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 block uppercase">
                Blockage Material
              </label>
              <select
                value={blockageType}
                onChange={(e) => setBlockageType(e.target.value as BlockageType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
              <label className="text-[11px] font-semibold text-slate-400 block uppercase">
                Blockage Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value) as ReportSeverity)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value={1}>1 - Minor / Surface</option>
                <option value={2}>2 - Moderate / Constricted</option>
                <option value={3}>3 - Severe / Fully Choked</option>
              </select>
            </div>
          </div>

          {/* Description summary */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase">
              Field Summary / Observation
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Grate clogged with plastic containers near junction"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Location details */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                Target Coordinates
              </span>
              <span className="font-mono text-slate-400">
                {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Linked automatically to nearest street zone within 200 metres.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isAnalyzing}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#20D6C2] hover:opacity-95 text-[#0B1220] font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 disabled:opacity-50"
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
