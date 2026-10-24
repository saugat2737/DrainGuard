# 05 — Risk Engine

Implemented in `src/lib/risk.ts` as pure functions. Unit tests required.

## Inputs
- `rain_mm`: expected rainfall over the next 3 hours (forecast or slider), 0–120
- `zone`: `elevation_factor`, `history_factor`
- `reports`: open reports linked to the zone

## Normalized factors (each 0..1)
| Factor | Calculation |
|--------|-------------|
| rain | `min(rain_mm / 60, 1)` |
| blockage | `min(sum(severity of open reports in zone) / 6, 1)` — cleared reports count 0, assigned count half |
| history | `zone.history_factor` |
| elevation | `zone.elevation_factor` |

## Score
```
score = 100 * ( 0.40*rain + 0.25*blockage + 0.20*history + 0.15*elevation )
```
Rain **gates** the result: if `rain_mm < 5`, multiply the score by 0.3 (a blocked drain is not a flood risk on a dry day, but it is still listed for inspection).

## Levels
| Score | Level | Colour |
|-------|-------|--------|
| 0–29 | low | green |
| 30–59 | medium | amber |
| 60–79 | high | orange |
| 80–100 | severe | red |

## Explanation format
Return both structured `factors[]` and a sentence, e.g.:

> "High risk (72): heavy rain forecast (45 mm), 2 open blockage reports (plastic, silt), frequent past waterlogging, low-lying street."

Rules: list only factors with contribution ≥ 10% of the score, ordered by contribution, in plain language, no jargon.

## Inspection priority
Priority = score at **current rain**, with ties broken by number of open reports. Additionally compute `score_at_forecast_peak` so the queue shows which drains matter even if it's dry right now.

## Route risk
For each OSRM route: buffer the line by 30 m, sum `score` of zones it intersects weighted by intersection length, normalize to 0–100. Pick the alternative with the lowest route risk if it adds no more than 40% to duration; otherwise show both and explain the trade-off.

## Honest limits (shown on `/about`)
Weights are hand-set and illustrative, not trained. Needs calibration with real rain gauge, drain map, and flood incident data.
