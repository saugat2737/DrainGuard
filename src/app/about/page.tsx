import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Droplets,
  Trash2,
  Mountain,
  History,
  Car,
  Cpu,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "Methodology & Transparency — DrainGuard",
  description: "Transparent, rule-based urban waterlogging risk engine and civic data disclosures.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--dg-page-bg)] text-[var(--dg-text)] transition-colors">
      {/* Top Header */}
      <header className="h-14 sm:h-16 border-b border-[var(--dg-border)] bg-[var(--dg-surface-card)] backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-[800] shadow-sm transition-colors">
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
            <span className="font-bold text-[10px] tracking-wider uppercase text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-lg bg-cyan-500/10">
              Methodology & Transparency
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/municipal"
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
          >
            Municipal Console →
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-4xl w-full mx-auto space-y-8">
        {/* Core Mission */}
        <section className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--dg-text)]">
            Explainable, Map-First Waterlogging Intelligence
          </h1>
          <p className="text-sm text-[var(--dg-text-secondary)] leading-relaxed">
            During heavy monsoon showers in Indian urban centers like Tumakuru, drainage networks choke on plastic, silt, and construction debris. Commuters discover impassable roads only when they reach the flooded junction, while municipal engineering teams react to complaints in the arbitrary order received rather than by objective hydrological risk. DrainGuard bridges this gap: providing proactive rain-aware routing for commuters and a deterministic clearance backlog for municipal teams.
          </p>
        </section>

        {/* Explainable Risk Engine Formula */}
        <section className="bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl p-5 sm:p-6 shadow-lg space-y-4 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--dg-text)]">The Rule-Based Risk Engine</h2>
              <p className="text-xs text-[var(--dg-text-muted)]">Deterministic, zero-black-box formula from docs/RISK_ENGINE.md</p>
            </div>
          </div>

          <div className="bg-[var(--dg-surface-input)] p-4 rounded-xl border border-[var(--dg-border)] font-mono text-xs text-cyan-600 dark:text-cyan-300 overflow-x-auto">
            score = 100 × ( 0.40 × rain + 0.25 × blockage + 0.20 × history + 0.15 × elevation )
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--dg-surface-muted)] border border-[var(--dg-border-subtle)] space-y-1">
              <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" /> Rain Factor (40% Weight)
              </span>
              <p className="text-[var(--dg-text-secondary)] leading-relaxed">
                Normalized as <code className="text-[var(--dg-text)] font-semibold">min(rain_mm / 60, 1)</code>. If expected rainfall over 3 hours is &lt; 5 mm, a physical rainfall gating multiplier (<code className="text-[var(--dg-text)] font-semibold">0.3×</code>) dampens baseline alerts.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--dg-surface-muted)] border border-[var(--dg-border-subtle)] space-y-1">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Blockage Factor (25% Weight)
              </span>
              <p className="text-[var(--dg-text-secondary)] leading-relaxed">
                Sum of citizen-reported severities (1–3) multiplied by lifecycle status weight (<code className="text-[var(--dg-text)] font-semibold">open: 1.0</code>, <code className="text-[var(--dg-text)] font-semibold">assigned: 0.5</code>, <code className="text-[var(--dg-text)] font-semibold">cleared: 0.0</code>), capped at 6.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--dg-surface-muted)] border border-[var(--dg-border-subtle)] space-y-1">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Historical Frequency (20% Weight)
              </span>
              <p className="text-[var(--dg-text-secondary)] leading-relaxed">
                Past monsoon inundation records per ward/catchment, normalized from <code className="text-[var(--dg-text)] font-semibold">0.0 to 1.0</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--dg-surface-muted)] border border-[var(--dg-border-subtle)] space-y-1">
              <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5" /> Elevation Depression (15% Weight)
              </span>
              <p className="text-[var(--dg-text-secondary)] leading-relaxed">
                Inverted elevation factor where low-lying basins and natural depression bowls receive higher vulnerability scores.
              </p>
            </div>
          </div>
        </section>

        {/* Traffic & Routing Honesty Disclosure */}
        <section className="bg-[var(--dg-surface-card)] border border-[var(--dg-border)] rounded-2xl p-5 sm:p-6 shadow-lg space-y-3 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--dg-text)]">Honest Routing & Traffic Disclosures</h2>
              <p className="text-xs text-[var(--dg-text-muted)]">Transparency on live telemetry and provider dependencies</p>
            </div>
          </div>

          <div className="text-xs text-[var(--dg-text-secondary)] space-y-2.5 leading-relaxed">
            <p>
              • <strong>OSRM Routing:</strong> Route options (Fastest, Rain-Safer, Balanced) are generated via public OpenStreetMap / OSRM services using geometric street networks and baseline speed profiles.
            </p>
            <p>
              • <strong>Vehicular Congestion:</strong> Real-time live vehicular traffic data is currently <strong>unavailable</strong> without a commercial provider key (TomTom Traffic API or HERE Routing v8). We do not fabricate fake live congestion layers.
            </p>
            <p>
              • <strong>Waterlogging Exposure vs. Confirmed Flood:</strong> Risk scores indicate statistical exposure based on rainfall forecasts, topography, and reported debris. They do not constitute guaranteed road passability or depth telemetry.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
