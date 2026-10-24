# 03 — Architecture

## Stack (fixed — do not swap without approval)
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS |
| Map | Leaflet + react-leaflet + OpenStreetMap tiles |
| Geo math | `@turf/turf` |
| Routing | OSRM public API (`router.project-osrm.org`) with `alternatives=true` |
| Weather | Open-Meteo forecast API (no key) |
| Storage | Supabase (Postgres + Storage) for reports; zones are seeded JSON in repo |
| Vision AI | Gemini API (model name via env `GEMINI_MODEL`); mock fallback if call fails |
| Validation | `zod` |
| Deploy | Vercel |

## Folder structure
```
draingaurd/
├─ docs/                      # these files
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx             # citizen map view
│  │  ├─ municipal/page.tsx   # inspection queue
│  │  ├─ about/page.tsx       # honesty/method page
│  │  └─ api/
│  │     ├─ weather/route.ts
│  │     ├─ zones/route.ts
│  │     ├─ reports/route.ts
│  │     ├─ analyze/route.ts
│  │     ├─ route/route.ts
│  │     └─ inspections/route.ts
│  ├─ components/             # MapView, RainSlider, ZonePanel, RoutePanel, ReportForm, QueueTable
│  ├─ lib/
│  │  ├─ risk.ts              # pure risk engine (unit-tested)
│  │  ├─ routing.ts           # OSRM + route risk scoring
│  │  ├─ vision.ts            # Gemini call + mock fallback
│  │  ├─ weather.ts
│  │  ├─ supabase.ts
│  │  └─ types.ts
│  └─ data/
│     ├─ zones.seed.json      # simulated zones (GeoJSON)
│     └─ reports.seed.json
├─ tests/
├─ .env.example
└─ README.md
```

## Data flow
```
Open-Meteo / slider ──► rain_mm ─┐
zones.seed.json ─────────────────┼─► risk.ts ─► zone scores + explanations ─► map, panel, queue
reports (Supabase) ──────────────┘
Photo ─► /api/analyze ─► vision.ts (Gemini | mock) ─► report saved ─► affects blockage factor
Origin/Dest ─► /api/route ─► OSRM alternatives ─► score each via zones (turf buffer) ─► pick lowest risk
```

## Design decisions
- Risk engine is a **pure function**: same input, same output, easy to test and explain.
- Zones are static; only reports and rain change at runtime.
- Every external call has a **timeout and a fallback** so the demo never dies (cached weather, mock vision, straight-line route notice).
- Server-side only for API keys. Never expose keys to the client.

## Env vars (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
NEXT_PUBLIC_MAP_CENTER_LAT=13.3392
NEXT_PUBLIC_MAP_CENTER_LNG=77.1140
```
