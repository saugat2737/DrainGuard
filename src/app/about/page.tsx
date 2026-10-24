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
} from "lucide-react";

export const metadata = {
  title: "Methodology & Transparency — DrainGuard",
  description: "Transparent, rule-based urban waterlogging risk engine and civic data disclosures.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#F8FAFC]">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0B1220]/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0">
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
              Methodology & Transparency
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
            Simulated demo data
          </span>
          <Link
            href="/municipal"
            className="text-xs text-[#38BDF8] hover:underline font-medium hidden sm:inline"
          >
            Municipal Console →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto space-y-8">
        {/* Core Mission */}
        <section className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Street-Level Waterlogging Intelligence
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            During intense monsoon rainfall in Indian tier-2 cities like Tumakuru, drainage networks choke on plastic, silt, and construction debris. Commuters discover impassable roads only when they reach the flooded junction, while municipal engineering teams react to complaints in the arbitrary order received rather than by objective hydrological risk. DrainGuard provides a transparent bridge: proactive street warnings for citizens and a prioritized inspection backlog for municipal crews.
          </p>
        </section>

        {/* Explainable Risk Engine Formula */}
        <section className="bg-[#142235]/90 border border-slate-700/70 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">The Rule-Based Risk Engine</h2>
              <p className="text-xs text-slate-400">Deterministic, zero-black-box formula from docs/05_RISK_ENGINE.md</p>
            </div>
          </div>

          <div className="bg-[#0B1220] p-4 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
            score = 100 × ( 0.40 × rain + 0.25 × blockage + 0.20 × history + 0.15 × elevation )
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-[#38BDF8] flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" /> Rain Factor (40% Weight)
              </span>
              <p className="text-slate-400">
                Normalized as <code className="text-slate-300">min(rain_mm / 60, 1)</code>. If expected rainfall over 3 hours is &lt; 5 mm, a dry-day gating multiplier (<code className="text-slate-300">0.3×</code>) dampens baseline alerts.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-[#F5B942] flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Blockage Factor (25% Weight)
              </span>
              <p className="text-slate-400">
                Normalized as <code className="text-slate-300">min(Σ(effective_severity) / 6, 1)</code>. Open reports have full weight (<code className="text-slate-300">1.0×</code>), assigned reports count half (<code className="text-slate-300">0.5×</code>), and cleared reports contribute <code className="text-slate-300">0</code>.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Flood History (20% Weight)
              </span>
              <p className="text-slate-400">
                Zone historical vulnerability factor (<code className="text-slate-300">0..1</code>) reflecting past waterlogging frequency during heavy monsoons.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-bold text-[#20D6C2] flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5" /> Elevation Vulnerability (15% Weight)
              </span>
              <p className="text-slate-400">
                Topographical factor (<code className="text-slate-300">0..1</code>) where higher values indicate low-lying natural catchments, underpasses, and lake basin fringes.
              </p>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-300">
            <span className="font-bold text-white block mb-1">Risk Level Classification Thresholds:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-semibold text-[11px]">
              <div className="p-2 rounded bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                Low: 0–29
              </div>
              <div className="p-2 rounded bg-[#F5B942]/15 text-[#F5B942] border border-[#F5B942]/30">
                Medium: 30–59
              </div>
              <div className="p-2 rounded bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30">
                High: 60–79
              </div>
              <div className="p-2 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
                Severe: 80–100
              </div>
            </div>
          </div>
        </section>

        {/* Route Risk Scoring Algorithm */}
        <section className="bg-[#142235]/90 border border-slate-700/70 rounded-xl p-5 md:p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Safer Routing Algorithm</h2>
              <p className="text-xs text-slate-400">OSRM Alternative Geometries + 30-Metre Buffer Intersection</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            When computing alternatives, DrainGuard queries the Open Source Routing Machine (OSRM). Each candidate driving route is buffered by 30 metres (0.03 km) using Turf.js. We intersect the buffer against all zone geometries, sum intersecting zone risk scores weighted by the physical length of the route traversing each zone, and normalize exposure to a 0–100 scale.
          </p>

          <div className="p-3 rounded-lg bg-[#0B1220]/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <span className="font-bold text-white block">Decision Boundary:</span>
            <p className="text-slate-400">
              The engine recommends the <strong className="text-[#34D399]">Safest</strong> alternative if it adds no more than <strong className="text-white">40%</strong> to total travel duration compared to the fastest route. If the detour time exceeds 40%, the <strong className="text-[#38BDF8]">Fastest</strong> route is recommended with explicit warnings regarding severe flood segments.
            </p>
          </div>
        </section>

        {/* Vision AI & Resilient Fallback */}
        <section className="bg-[#142235]/90 border border-slate-700/70 rounded-xl p-5 md:p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#38BDF8]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Vision AI & Deterministic Fallbacks</h2>
              <p className="text-xs text-slate-400">Resilient multi-tier architecture</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Citizen photographs of blocked drains are analyzed via the Gemini Vision REST API to classify waste material (plastic, silt, debris, construction) and estimate blockage severity (1–3). Every external call enforces an 8-second timeout. If the API key is not configured, network fails, or the response is invalid, DrainGuard deterministically switches to the documented fallback (<code className="text-slate-300">blockage_type: unknown, severity: 2, fallback: true</code>). The application never crashes and clearly identifies automated vs. fallback classifications.
          </p>
        </section>

        {/* Data Sources and Honest Disclosure */}
        <section className="bg-[#142235]/90 border border-amber-500/30 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F5B942]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Data Sources & Honest Transparency</h2>
              <p className="text-xs text-amber-300/80">Governed by docs/08_AGENT_RULES.md</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#0B1220]/80 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Open-Meteo API</span>
                <p className="text-slate-400">Live 3-hour precipitation forecasts for Tumakuru (Lat 13.3392, Lng 77.1140). Cached in-memory for resilience.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B1220]/80 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">OpenStreetMap & Leaflet</span>
                <p className="text-slate-400">Cartographic road network base layers and geospatial polygon projection.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B1220]/80 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">OSRM Public Routing</span>
                <p className="text-slate-400">Turn-by-turn driving routing and duration calculations with alternative paths.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1.5">
              <span className="font-bold block text-amber-300">Simulated Demonstration Data Disclosure:</span>
              <p>
                All 10 street zones around Tumakuru (e.g., Amanikere Lowlands, B.H. Road Spine, M.G. Road Underpass) and baseline blockage reports are <strong>simulated demonstration fixtures</strong>. They are designed to demonstrate the mathematical risk engine, spatial indexing, and municipal clearance workflow during hackathon evaluation. They do not represent verified municipal surveys or official flood records.
              </p>
              <p className="text-slate-400 text-[11px]">
                Real-world civic deployment would require calibrated physical rainfall telemetry gauges, Digital Elevation Models (DEM) from LIDAR/SRTM surveys, and calibrated municipal stormwater pipe topology from the local urban development authority.
              </p>
            </div>
          </div>
        </section>

        {/* Back navigation */}
        <div className="pt-2 pb-8 flex items-center justify-between text-xs text-slate-400">
          <Link href="/" className="hover:text-white flex items-center gap-1 transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Citizen Map
          </Link>
          <Link href="/municipal" className="text-[#38BDF8] hover:underline">
            View Municipal Backlog →
          </Link>
        </div>
      </main>
    </div>
  );
}
