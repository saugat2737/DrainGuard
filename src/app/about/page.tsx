import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShieldCheck,
  Droplets,
  Trash2,
  Mountain,
  History,
  Navigation,
  Sparkles,
  AlertTriangle,
  Server,
  Layers,
  Cpu,
  Car,
} from "lucide-react";

export const metadata = {
  title: "Methodology & Transparency — DrainGuard",
  description: "Transparent, rule-based urban waterlogging risk engine and civic data disclosures.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#F8FAFC]">
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
              Methodology & Transparency
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/municipal"
            className="text-xs text-[#38BDF8] hover:underline font-semibold"
          >
            Municipal Console →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-4xl w-full mx-auto space-y-8">
        {/* Core Mission */}
        <section className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Explainable, Map-First Waterlogging Intelligence
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            During heavy monsoon showers in Indian urban centers like Tumakuru, drainage networks choke on plastic, silt, and construction debris. Commuters discover impassable roads only when they reach the flooded junction, while municipal engineering teams react to complaints in the arbitrary order received rather than by objective hydrological risk. DrainGuard bridges this gap: providing proactive rain-aware routing for commuters and a deterministic clearance backlog for municipal teams.
          </p>
        </section>

        {/* Explainable Risk Engine Formula */}
        <section className="bg-[#142235]/95 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">The Rule-Based Risk Engine</h2>
              <p className="text-xs text-slate-400">Deterministic, zero-black-box formula from docs/05_RISK_ENGINE.md</p>
            </div>
          </div>

          <div className="bg-[#0B1220] p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
            score = 100 × ( 0.40 × rain + 0.25 × blockage + 0.20 × history + 0.15 × elevation )
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-[#38BDF8] flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" /> Rain Factor (40% Weight)
              </span>
              <p className="text-slate-400 leading-relaxed">
                Normalized as <code className="text-slate-300">min(rain_mm / 60, 1)</code>. If expected rainfall over 3 hours is &lt; 5 mm, a physical rainfall gating multiplier (<code className="text-slate-300">0.3×</code>) dampens baseline alerts.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-[#F5B942] flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Blockage Factor (25% Weight)
              </span>
              <p className="text-slate-400 leading-relaxed">
                Sum of citizen-reported severities (1–3) multiplied by lifecycle status weight (<code className="text-slate-300">open: 1.0</code>, <code className="text-slate-300">assigned: 0.5</code>, <code className="text-slate-300">cleared: 0.0</code>), capped at 6.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Historical Frequency (20% Weight)
              </span>
              <p className="text-slate-400 leading-relaxed">
                Past monsoon inundation records per ward/catchment, normalized from <code className="text-slate-300">0.0 to 1.0</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-[#20D6C2] flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5" /> Elevation Depression (15% Weight)
              </span>
              <p className="text-slate-400 leading-relaxed">
                Inverted elevation factor where low-lying basins and natural depression bowls receive higher vulnerability scores.
              </p>
            </div>
          </div>
        </section>

        {/* Traffic & Routing Honesty Disclosure */}
        <section className="bg-[#142235]/95 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Honest Routing & Traffic Disclosures</h2>
              <p className="text-xs text-slate-400">Transparency on live telemetry and provider dependencies</p>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
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
