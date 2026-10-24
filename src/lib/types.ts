export type RiskLevel = "low" | "medium" | "high" | "severe";

export type BlockageType =
  | "plastic"
  | "silt"
  | "debris"
  | "construction"
  | "none"
  | "unknown";

export type ReportSeverity = 1 | 2 | 3;

export type ReportStatus = "open" | "assigned" | "cleared";

export type ReportSource = "citizen" | "seed";

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: [number, number][][]; // [[[lng, lat], ...]]
}

export interface Zone {
  id: string; // "Z01"
  name: string; // "Zone near Amanikere (approx.)"
  geometry: GeoJSONLineString | GeoJSONPolygon;
  elevation_factor: number; // 0..1, higher = lower-lying = riskier
  history_factor: number; // 0..1, past waterlogging frequency
  simulated: true; // always true for seed data
}

export interface Report {
  id: string;
  lat: number;
  lng: number;
  zone_id: string | null; // nearest zone within 200 m
  photo_url: string | null;
  blockage_type: BlockageType;
  severity: ReportSeverity; // 1 minor, 3 severe
  summary: string; // one-line AI description
  status: ReportStatus;
  source: ReportSource;
  created_at: string;
}

export type RiskFactorKey = "rain" | "blockage" | "history" | "elevation";

export interface RiskFactor {
  key: RiskFactorKey;
  value: number; // 0..1 normalized
  weight: number; // factor weight in formula
  contribution: number; // weight * value * 100 (gated if applicable)
  text: string; // plain-language description
}

export interface ZoneRisk {
  zone_id: string;
  score: number; // 0..100
  level: RiskLevel;
  factors: RiskFactor[];
  explanation: string; // human-readable sentence
  linked_report_ids: string[];
}
