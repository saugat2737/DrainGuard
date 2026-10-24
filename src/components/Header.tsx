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
  Server,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";

interface HeaderProps {
  onOpenReportModal?: () => void;
  onOpenStatusDrawer?: () => void;
  isSimulated?: boolean;
}

export function Header({
  onOpenReportModal,
  onOpenStatusDrawer,
  isSimulated = false,
}: HeaderProps) {
  const { resolvedTheme } = useTheme();

  return (
    <header className="h-14 sm:h-16 border-b border-[var(--dg-border)] bg-[var(--dg-surface-card)] backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-sm transition-colors">
      {/* Brand & City Context */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src={
              resolvedTheme === "light"
                ? "/assets/drainguard-logo.svg"
                : "/assets/drainguard-logo-dark.svg"
            }
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
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--dg-surface-elevated)] border border-[var(--dg-border)] text-[11px] sm:text-xs text-[var(--dg-text-secondary)] font-medium">
          <MapPin className="w-3 h-3 text-[#0EA5E9] shrink-0" />
          <span className="truncate max-w-[120px] sm:max-w-none text-[var(--dg-text)]">
            Tumakuru, KA
          </span>
        </div>

        {/* Mode badge */}
        {isSimulated ? (
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            SIMULATED RAIN
          </span>
        ) : (
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            LIVE FORECAST
          </span>
        )}
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenReportModal && (
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F43F5E] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-950/20 transition active:scale-95 touch-target"
            aria-label="Report blocked drain"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Report Drain</span>
            <span className="xs:hidden">Report</span>
          </button>
        )}

        {onOpenStatusDrawer && (
          <button
            onClick={onOpenStatusDrawer}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-xs font-medium text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] transition shadow-sm touch-target"
            title="Inspect Data & API Service Status"
          >
            <Server className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>Data Status</span>
          </button>
        )}

        <Link
          href="/municipal"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-xs font-medium text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] transition shadow-sm touch-target"
          title="Open Municipal Backlog"
        >
          <Building2 className="w-3.5 h-3.5 text-[#0EA5E9]" />
          <span className="hidden md:inline">Municipal</span>
        </Link>

        <Link
          href="/about"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-xs font-medium text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] transition shadow-sm touch-target"
          title="Risk Engine Methodology & Disclosures"
        >
          <FileText className="w-3.5 h-3.5 text-[var(--dg-text-muted)]" />
          <span className="hidden lg:inline">Methodology</span>
        </Link>

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  );
}
