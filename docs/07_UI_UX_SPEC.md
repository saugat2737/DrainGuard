# 07 — UI / UX Spec

## Principles
- Looks like a real civic product, not a student project: clean, high contrast, consistent spacing.
- The map is the hero. Everything else is a panel around it.
- Colour always paired with a label or icon (accessibility).
- Mobile-first: the demo may be shown on a phone.

## Screens

### 1. Citizen view `/`
- Full-height map (Leaflet, OSM tiles), centered on Tumakuru.
- **Top bar:** logo "DrainGuard", badge "Simulated demo data", link to Municipal view and About.
- **Rain panel (top-left):** live forecast chip ("Next 3h: 12 mm — Open-Meteo"), slider "Simulate rain 0–120 mm", reset button.
- **Legend (bottom-left):** Low / Medium / High / Severe.
- **Zone panel (right drawer / bottom sheet on mobile):** zone name, score ring, level badge, factor bars, plain-language explanation, linked reports with photos, "Report blocked drain here" button.
- **Route panel:** pick origin/destination by clicking the map or searching; shows fastest vs safest cards (time, distance, risk), and the recommendation with reason.
- **Report modal:** photo upload, map pin, AI result preview (type, severity, summary) with option to edit, submit.

### 2. Municipal view `/municipal`
- Header stats: zones at High/Severe, open reports, current rain.
- Ranked table: rank, zone, score, level, forecast-peak score, open reports, top reason, "Mark assigned / cleared" (S1).
- Rain slider shared with citizen view so the queue re-ranks live.
- Mini map with the same colors.

### 3. About `/about`
- How the score works (formula in plain words), data sources, what is simulated, limits, how it would be validated with real data. Short and honest.

## Visual style
- Font: Inter or Geist. Base 16px. Rounded-xl cards, subtle shadows.
- Palette: slate neutrals; risk colours — green `#22c55e`, amber `#f59e0b`, orange `#f97316`, red `#dc2626`; accent teal/blue `#0ea5e9`.
- Animate zone colour changes (300 ms) when the slider moves; debounce slider at ~150 ms.
- Empty, loading, and error states for every panel (skeletons, not spinners only).

## Accessibility
Keyboard-focusable controls, aria labels on slider and buttons, contrast ≥ 4.5:1, text alternatives for map state ("Zone Z03: High risk, 72").
