# 11 — Testing

## Unit tests (Vitest) — required
**risk.ts**
- Score is 0 when all inputs are 0; ≤100 at max inputs.
- `rain_mm < 5` multiplies by 0.3.
- Level thresholds at 29/30, 59/60, 79/80.
- Cleared reports contribute 0; assigned count half.
- Explanation lists factors in contribution order and omits <10% contributors.

**routing.ts**
- Route crossing a severe zone scores higher than one avoiding it.
- Recommendation switches to "fastest" when safest adds >40% duration.

## Manual end-to-end checklist
- [ ] Load `/` on desktop and phone width, no console errors
- [ ] Slider 0 → 100 mm recolors zones smoothly
- [ ] Click each risk level; explanation is correct and readable
- [ ] Route between two points shows fastest and safest with reason
- [ ] Upload photo → AI result appears → report saved → zone risk increases
- [ ] `/municipal` ranking matches the map and updates with slider
- [ ] Mark report cleared → risk drops

## Failure drills
| Drill | Expected |
|-------|----------|
| Remove `GEMINI_API_KEY` | Fallback analysis, flagged for manual review |
| Block `router.project-osrm.org` | Friendly "routing unavailable" message, rest works |
| Offline weather | Cached/0 value, slider still works |
| 10 MB or non-image file | Clear validation error |
| Report with location far from any zone | Saved with `zone_id: null`, no crash |

## Pre-submission checks
- [ ] Public Vercel URL tested in incognito and on another device
- [ ] Env vars set in Vercel (not just locally)
- [ ] Supabase storage bucket publicly readable for photos
- [ ] `npm run build` green on a clean clone
- [ ] No secrets in git history (`git log -p | grep -i key` sanity check)
