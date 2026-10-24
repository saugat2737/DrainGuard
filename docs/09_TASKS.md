# 09 — Task Plan

Time budget: 6 PM (24 Oct) → 10 AM (25 Oct). Submit by 9 AM latest. Tick boxes as you go.

## Phase 0 — Setup (6:00–7:00 PM)
- [ ] Create repo `draingaurd`, push empty scaffold, add docs
- [ ] `create-next-app` (TS, Tailwind, App Router), configure lint/typecheck/test scripts
- [ ] Create Supabase project, `reports` table, `report-photos` bucket
- [ ] Get Gemini API key; fill `.env.local` and Vercel env vars
- [ ] Deploy empty app to Vercel; confirm public URL works

## Phase 1 — Core data + risk (7:00–9:00 PM)
- [x] `types.ts` per data model
- [x] `zones.seed.json` and `reports.seed.json` (simulated, labeled)
- [x] `risk.ts` + unit tests
- [x] `/api/weather`, `/api/zones`, `/api/inspections`

## Phase 2 — Map + explanation (9:00 PM–12:00 AM)
- [x] `MapView` with colored zones and legend
- [x] `RainSlider` (live forecast + simulation), debounce
- [x] `ZonePanel` with factor bars and explanation text
- [x] Simulated-data badge and top bar

## Phase 3 — Reports + AI (12:00–2:00 AM)
- [ ] `/api/analyze` with Gemini + mock fallback
- [ ] `/api/reports` (POST/GET), nearest-zone linking
- [ ] `ReportForm` modal with photo preview and AI result
- [ ] Report immediately changes zone risk on the map

## Phase 4 — Routing + municipal (2:00–4:00 AM)
- [ ] `routing.ts` + `/api/route` with risk scoring and tests
- [ ] `RoutePanel` (fastest vs safest, reason)
- [ ] `/municipal` ranked queue with shared rain state
- [ ] (S1) status update Open → Assigned → Cleared

## Phase 5 — Polish + hardening (4:00–6:00 AM)
- [ ] Loading/empty/error states everywhere
- [ ] Mobile layout pass
- [ ] `/about` page (method, sources, limits)
- [ ] Fallback tests: disable network for Gemini/OSRM/weather, confirm app still works
- [ ] Lighthouse/accessibility quick pass

## Phase 6 — Ship (6:00–9:00 AM)
- [ ] Production deploy; test public link on phone and another browser
- [ ] README with screenshots, setup, architecture, honesty section
- [ ] Record demo video (see `12_DEMO_SCRIPT.md`)
- [ ] LinkedIn post tagging IEEE SIT SB and IEEE CS
- [ ] Fill and submit the form; screenshot confirmation
- [ ] **Feature freeze at 6:00 AM**

## Later (do NOT build during the hackathon)
- (agent adds ideas here)
