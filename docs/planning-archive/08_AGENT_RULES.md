# 08 — Agent Rules (Antigravity)

> These rules apply to every agent session on this repo. If a request conflicts with them, stop and ask.
> Setup: copy this file's content into the workspace rules (`.agent/rules/` in the repo) and/or root `AGENTS.md`, so Antigravity loads it automatically. Confirm in the Antigravity UI that the rule is active.

## 1. Source of truth
1. Before writing code, read `docs/README.md`, then `02_PRD.md`, `03_ARCHITECTURE.md`, and the doc relevant to the task.
2. If code and docs disagree, **docs win**. Propose a doc change instead of silently diverging.
3. Do not build anything listed under Non-goals in `02_PRD.md`.

## 2. Workflow
1. Produce a short plan (files to touch, steps, risks) **before** coding. Wait for approval on plans that add dependencies or change structure.
2. Work on one task from `09_TASKS.md` at a time. Tick the checkbox when done.
3. After each task: run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Fix failures before moving on.
4. Commit after each task with a clear message (`feat: risk engine with tests`). Small commits, so the history shows real work during the event.
5. Never leave the app in a broken state at the end of a session.

## 3. Code standards
- TypeScript `strict`; no `any` unless justified in a comment.
- Pure logic in `src/lib/`, UI in `src/components/`, no business logic inside components.
- Validate all API input with `zod`. Handle errors; no unhandled promise rejections.
- Use the exact types in `04_DATA_MODEL.md`; do not rename fields.
- Keep files focused (< ~300 lines). Prefer clear names over comments; comment the *why*.
- Accessible, responsive UI per `07_UI_UX_SPEC.md`.

## 4. Dependencies
- Allowed: those listed in `03_ARCHITECTURE.md`.
- Anything else: ask first, state the reason and the size/maintenance cost. Pin versions. Use well-known packages only.

## 5. Secrets and safety
- Never hardcode or commit secrets. Use `.env.local`; keep `.env.example` updated; confirm `.gitignore` covers `.env*`.
- Do not expose server keys to client code (`NEXT_PUBLIC_` only for non-secret values).
- Terminal: no destructive commands (`rm -rf`, force pushes, dropping DB tables, global installs) without explicit approval.
- Do not send user photos anywhere except the configured vision API.

## 6. Honesty rules (critical for judging)
- All seed data is labeled **simulated** in code, data files, and UI.
- Never claim the risk model is "AI-predicted" or "validated". It is rule-based and explainable.
- Never invent statistics, official data, or real flood locations. If a number is a placeholder, say so in the UI and README.
- Cite data sources (Open-Meteo, OpenStreetMap, OSRM) in the About page and README.

## 7. Resilience
- Every external call: timeout + fallback (see `06_API_SPEC.md`). The demo must work if Gemini, OSRM or Open-Meteo is down.
- Provide a deterministic demo path: seeded data + slider works with zero network except map tiles.

## 8. Testing
- Unit tests for `risk.ts` and route scoring are mandatory (see `11_TESTING.md`).
- Do not claim a feature works until you have run it. Report what you actually verified.

## 9. Scope control
- No refactors, restyling, or features outside the current task.
- If you spot an improvement, add it to a "Later" list in `09_TASKS.md` instead of doing it.
- Third-party code: only libraries. Do not copy-paste other projects' code; if you reuse a snippet, note it in the README credits.

## 10. Communication
- Summaries must be short: what changed, how verified, what's next, any blockers.
- Ask at most one clarifying question at a time, and only when it blocks progress.
