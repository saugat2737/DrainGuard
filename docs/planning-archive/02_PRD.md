# 02 — Product Requirements (MVP)

## Personas
- **Citizen (Asha, commuter):** wants to know if her route will flood and what to take instead.
- **Municipal officer (Ravi):** wants to know which drains to inspect first today.

## MVP features (MUST)
| ID | Feature | Acceptance criteria |
|----|---------|--------------------|
| F1 | Risk map | Leaflet map of Tumakuru with zones colored Low/Medium/High/Severe |
| F2 | Rain input | Live forecast from Open-Meteo + a "Simulate rain" slider (0–120 mm) that instantly recolors the map |
| F3 | Explainable risk | Clicking a zone shows score, level and a factor breakdown in plain language |
| F4 | Safe route | User picks origin and destination; app shows fastest route and a lower-risk alternative with risk comparison |
| F5 | Citizen report | Upload photo + pick location on map; AI returns blockage type and severity; report saved |
| F6 | Inspection queue | Municipal view lists zones ranked by risk with reasons and linked reports |
| F7 | Demo mode | Seeded data, clearly badged "Simulated demo data" |

## SHOULD (only if MUST is done and tested)
- S1: Status change on a report (Open → Assigned → Cleared) that lowers zone risk.
- S2: Shareable link to a zone.
- S3: Dark mode.

## Non-goals (DO NOT BUILD)
Login/accounts, mobile app, real ML training, payments, push notifications, multi-city support, admin CMS, chat features.

## User flow
Calm map → raise rain slider → zones turn red → click zone → see explanation → plan route → see detour → submit drain photo → report appears → inspection queue re-ranks.

## Definition of done
- Deployed on a public URL, tested from a different device.
- README, demo video, LinkedIn post ready.
- No console errors in the main flow; works on mobile width.
