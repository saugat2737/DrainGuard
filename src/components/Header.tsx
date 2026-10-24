"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

interface HeaderProps {
  onOpenReportModal?: () => void;
  isSimulated?: boolean;
}

export function Header({ onOpenReportModal, isSimulated = false }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 border-b border-slate-800/80 bg-[#0B1220]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-md">
      {/* Brand & City Context */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/assets/drainguard-logo-dark.svg"
            alt="DrainGuard"
            width={130}
            height={26}
            className="h-6 sm:h-7 w-auto object-contain hidden sm:block"
            priority
          />
          <Image
            src="/assets/drainguard-icon.svg"
            alt="DrainGuard"
            width={26}
            height={26}
            className="h-6 w-auto object-contain sm:hidden"
            priority
          />
        </Link>

        {/* Location pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/70 text-[11px] sm:text-xs text-slate-300 font-medium">
          <MapPin className="w-3 h-3 text-[#38BDF8] shrink-0" />
          <span className="truncate max-w-[120px] sm:max-w-none">Tumakuru, KA</span>
        </div>

        {/* Mode badge */}
        {isSimulated ? (
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            SIMULATED
          </span>
        ) : (
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE METEO
          </span>
        )}
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenReportModal && (
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F43F5E] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition active:scale-95 touch-target"
            aria-label="Report clogged drain or flooded choke point"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Report Drain</span>
            <span className="xs:hidden">Report</span>
          </button>
        )}

        <Link
          href="/municipal"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#142235] hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-200 hover:text-white transition shadow-sm touch-target"
          title="Open Municipal Backlog"
        >
          <Building2 className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span className="hidden md:inline">Municipal</span>
        </Link>

        <Link
          href="/about"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#142235] hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-300 hover:text-white transition shadow-sm touch-target"
          title="Risk Engine Methodology & Data Disclosures"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden lg:inline">Methodology</span>
        </Link>
      </div>
    </header>
  );
}
