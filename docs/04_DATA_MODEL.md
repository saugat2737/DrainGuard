# 04 — Data Model

## Types (`src/lib/types.ts`)
```ts
export type RiskLevel = "low" | "medium" | "high" | "severe";

export interface Zone {
  id: string;                 // "Z01"
  name: string;               // "Zone near Amanikere (approx.)"
  geometry: GeoJSON.LineString | GeoJSON.Polygon;
  elevation_factor: number;   // 0..1, higher = lower-lying = riskier
  history_factor: number;     // 0..1, past waterlogging frequency
  simulated: true;            // always true for seed data
}

export interface Report {
  id: string;
  lat: number;
  lng: number;
  zone_id: string | null;     // nearest zone within 200 m
  photo_url: string | null;
  blockage_type: "plastic" | "silt" | "debris" | "construction" | "none" | "unknown";
  severity: 1 | 2 | 3;        // 1 minor, 3 severe
  summary: string;            // one-line AI description
  status: "open" | "assigned" | "cleared";
  source: "citizen" | "seed";
  created_at: string;
}

export interface ZoneRisk {
  zone_id: string;
  score: number;              // 0..100
  level: RiskLevel;
  factors: { key: "rain"|"blockage"|"history"|"elevation"; value: number; weight: number; contribution: number; text: string }[];
  explanation: string;        // human-readable sentence
  linked_report_ids: string[];
}
```

## Supabase table (SQL)
```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  zone_id text,
  photo_url text,
  blockage_type text not null default 'unknown',
  severity int not null default 1 check (severity between 1 and 3),
  summary text,
  status text not null default 'open',
  source text not null default 'citizen',
  created_at timestamptz not null default now()
);
-- Storage bucket: "report-photos" (public read)
```

## Seed data rules
- 8–12 zones around Tumakuru city center (approx. center 13.3392, 77.1140). Coordinates are **placeholders to be adjusted by the team on the map**; do not claim they are real flood locations.
- Mix of factor values so the map has visible variety: 2–3 low-lying high-history zones, a few medium, some safe.
- 6–10 seeded reports (`source: "seed"`) spread across the riskiest zones.
- Every seed file carries `"_note": "Simulated demo data"`.
- The UI must show a persistent "Simulated demo data" badge.
