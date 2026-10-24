# 06 — API Spec

All routes are Next.js route handlers. Validate every input with `zod`. Return JSON `{ data }` on success or `{ error: { code, message } }` on failure. Set a 8 s timeout on every outbound call.

## GET `/api/weather`
Fetch forecast from Open-Meteo for the map center.
- Response: `{ data: { rain_mm_next_3h: number, peak_hour: string, source: "open-meteo" | "cache" } }`
- Fallback: last cached value, else `0` with `source: "cache"`.

## GET `/api/zones?rain_mm=<number>`
Returns zones with computed risk. `rain_mm` optional (defaults to live forecast).
- Response: `{ data: { rain_mm, zones: (Zone & { risk: ZoneRisk })[] } }`

## GET `/api/reports`
Returns all reports (newest first).

## POST `/api/analyze`
`multipart/form-data`: `photo` (image ≤ 5 MB, jpeg/png/webp).
- Calls `vision.ts` (Gemini). Prompt must request **strict JSON**: `{ blockage_type, severity, summary }`.
- Fallback on error/timeout: `{ blockage_type: "unknown", severity: 2, summary: "Automatic analysis unavailable; flagged for manual review." }` plus `fallback: true`.

## POST `/api/reports`
JSON: `{ lat, lng, photo_url?, blockage_type, severity, summary }`
- Finds nearest zone within 200 m, stores report, returns report + updated `ZoneRisk` for that zone.

## POST `/api/route`
JSON: `{ origin: {lat,lng}, destination: {lat,lng}, rain_mm }`
- Calls OSRM with `alternatives=true`, scores each route, returns:
```json
{ "data": { "fastest": Route, "safest": Route, "recommendation": "safest|fastest", "reason": "string" } }
```
- `Route = { geometry, duration_s, distance_m, risk_score, zones_crossed: string[] }`
- Fallback if OSRM fails: return error code `ROUTING_UNAVAILABLE`; UI shows a friendly message.

## GET `/api/inspections?rain_mm=<number>`
Ranked list: `{ zone_id, name, score, level, score_at_forecast_peak, open_reports, top_reason }[]`

## Security notes
- Gemini and Supabase service keys are server-side only.
- Reject files that are not images; strip nothing sensitive is needed, but never log image bytes.
- Basic rate limit on `/api/analyze` (e.g., 10 requests/min per IP) to protect the API quota.
