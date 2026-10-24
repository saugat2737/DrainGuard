# 10 — Antigravity Prompts (use in order)

Tips: use **Planning mode** for prompts 1, 4, 6; **Fast mode** for small fixes. Review the plan artifact before approving. Run one prompt per task.

---
## Prompt 0 — Load context
```
Read every file in /docs, starting with docs/README.md. Summarize in 10 lines: the product, MVP features, stack, and the rules in 08_AGENT_RULES.md. Do not write code yet. List any contradictions or missing info you find.
```

## Prompt 1 — Scaffold
```
Follow docs/08_AGENT_RULES.md. Do Phase 0 from docs/09_TASKS.md, scaffolding only: Next.js (App Router, TypeScript strict, Tailwind), folder structure from docs/03_ARCHITECTURE.md, scripts for lint/typecheck/test/build (use Vitest), .env.example, .gitignore covering .env*. Give me a plan first. Do not add dependencies beyond 03_ARCHITECTURE.md.
```

## Prompt 2 — Data and risk engine
```
Implement src/lib/types.ts from docs/04_DATA_MODEL.md, simulated seed files for ~10 zones around Tumakuru (center 13.3392, 77.1140; mark all as simulated), and src/lib/risk.ts exactly per docs/05_RISK_ENGINE.md. Write Vitest unit tests covering: dry-day gating, level thresholds, blockage weighting by status, explanation ordering. Run tests and report results.
```

## Prompt 3 — API: weather, zones, inspections
```
Implement /api/weather, /api/zones, /api/inspections per docs/06_API_SPEC.md with zod validation, 8s timeouts, and fallbacks. Verify with curl and show me the outputs.
```

## Prompt 4 — Map UI
```
Build the citizen view per docs/07_UI_UX_SPEC.md: MapView (react-leaflet, SSR-safe via dynamic import), colored zones with legend, RainSlider with live forecast + simulation, ZonePanel with factor bars and explanation. Include the "Simulated demo data" badge and loading/error states. Open the app in the browser and verify the slider recolors the map; attach screenshots.
```

## Prompt 5 — Reports + vision
```
Implement /api/analyze (Gemini via GEMINI_MODEL with strict JSON output and mock fallback), /api/reports, and the ReportForm modal. A new report must immediately update that zone's risk. Test with a real photo and with the API key removed (fallback). Never expose keys to the client.
```

## Prompt 6 — Routing
```
Implement src/lib/routing.ts and /api/route per docs/05_RISK_ENGINE.md (route risk) and docs/06_API_SPEC.md. Add unit tests for route risk scoring using fixed geometries. Build RoutePanel showing fastest vs safest with a plain-language reason. Handle OSRM failure gracefully.
```

## Prompt 7 — Municipal view
```
Build /municipal per docs/07_UI_UX_SPEC.md: stats header, ranked inspection table, shared rain state, optional status updates (Open → Assigned → Cleared) that lower zone risk. Verify re-ranking when the slider changes.
```

## Prompt 8 — Polish + About
```
Do the Phase 5 checklist in docs/09_TASKS.md: states, mobile layout, accessibility pass, /about page (method, sources, simulated data, limits). No new features. Report what you verified.
```

## Prompt 9 — Hardening
```
Run the checks in docs/11_TESTING.md. Simulate failures of Gemini, OSRM and Open-Meteo and confirm the app still completes the demo flow. Fix anything that breaks. Run lint, typecheck, test, build.
```

## Prompt 10 — README
```
Write the root README.md per docs/13_SUBMISSION_CHECKLIST.md: problem, solution, screenshots placeholders, features, architecture diagram (mermaid), setup, env vars, honesty/limits section, credits for libraries and data sources. Do not claim anything that isn't implemented.
```

## Emergency prompts
- **Build broken:** `Stop adding features. Get lint, typecheck, test and build green with the smallest possible changes. Explain each fix.`
- **Behind schedule:** `List what's left in docs/09_TASKS.md, propose the smallest cut that keeps the demo flow in docs/12_DEMO_SCRIPT.md intact, and wait for my approval.`
