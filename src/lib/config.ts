/**
 * App configuration constants per docs/03_ARCHITECTURE.md
 */

export const APP_CONFIG = {
  name: "DrainGuard",
  tagline: "Street-level rain warnings for citizens + ranked inspection queue for the municipality",
  simulated: true,
  defaultCenter: {
    lat: 13.3392,
    lng: 77.1140,
    city: "Tumakuru",
  },
  riskLevels: ["low", "medium", "high", "severe"] as const,
};

export type AppRiskLevel = (typeof APP_CONFIG.riskLevels)[number];

export function getRiskColorClass(level: AppRiskLevel): string {
  switch (level) {
    case "low":
      return "text-emerald-500";
    case "medium":
      return "text-amber-500";
    case "high":
      return "text-orange-500";
    case "severe":
      return "text-rose-600";
  }
}
