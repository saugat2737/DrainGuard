export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">DrainGuard</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Simulated demo data
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Street-level rain warnings for citizens + ranked inspection queue for the municipality.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            Center: Tumakuru (13.3392°N, 77.1140°E)
          </span>
        </div>
      </header>

      {/* Main Grid: Scaffold Placeholder Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Citizen Map Placeholder */}
        <section
          aria-label="Citizen Map Panel"
          className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-800/40 p-6 flex flex-col justify-between min-h-[360px]"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Citizen Risk Map</h2>
            <p className="text-sm text-slate-400 mt-1">
              Interactive Leaflet street map of Tumakuru with color-coded risk zones (Low, Medium, High, Severe).
            </p>
          </div>
          <div className="flex items-center justify-center p-8 border border-dashed border-slate-700 rounded-lg text-slate-500 text-sm">
            Map View module will mount here in Phase 2
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 pt-4 border-t border-slate-800">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Low</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> High</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Severe</span>
          </div>
        </section>

        {/* Controls and Municipal Backlog Placeholder */}
        <div className="space-y-6">
          {/* Rainfall simulation control */}
          <section
            aria-label="Rainfall Controls"
            className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 space-y-3"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Weather & Simulation
            </h2>
            <p className="text-xs text-slate-400">
              Live forecast (Open-Meteo) + interactive rain slider (0–120 mm).
            </p>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              Rain controls component will mount here in Phase 2
            </div>
          </section>

          {/* Municipal inspection queue preview */}
          <section
            aria-label="Municipal Backlog"
            className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 space-y-3"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Municipal Inspection Queue
            </h2>
            <p className="text-xs text-slate-400">
              Ranked backlog prioritized by risk score, forecast peak, and reported blockages.
            </p>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              Inspection table component will mount here in Phase 4
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
