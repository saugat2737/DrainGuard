import { Report, Zone } from "./types";
import seedReportsData from "@/data/reports.seed.json";
import * as turf from "@turf/turf";

// In-memory reports store initialized from seed data
let runtimeReports: Report[] = [
  ...(seedReportsData.reports as unknown as Report[]),
];

/**
 * Reset store to initial seed reports (for testing)
 */
export function resetReportsStore(): void {
  runtimeReports = [
    ...(seedReportsData.reports as unknown as Report[]),
  ];
}

/**
 * Return all current reports (newest first)
 */
export function getAllReports(): Report[] {
  return [...runtimeReports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Find nearest zone within maxDistanceMeters (default 200m).
 * Returns matching zone or null if outside radius.
 */
export function findNearestZone(
  lat: number,
  lng: number,
  zones: Zone[],
  maxDistanceMeters = 200
): { zone: Zone | null; distanceMeters: number } {
  const pt = turf.point([lng, lat]);
  let nearestZone: Zone | null = null;
  let minDistanceMeters = Infinity;

  for (const zone of zones) {
    let distM = Infinity;
    if (zone.geometry.type === "Polygon") {
      const poly = turf.polygon(zone.geometry.coordinates);
      // If point is strictly inside polygon, distance is 0
      if (turf.booleanPointInPolygon(pt, poly)) {
        distM = 0;
      } else {
        // Distance to polygon boundary
        const boundary = turf.polygonToLine(poly);
        if (boundary && "type" in boundary && boundary.type === "Feature") {
          distM = turf.pointToLineDistance(pt, boundary as any, { units: "meters" });
        }
      }
    } else if (zone.geometry.type === "LineString") {
      const line = turf.lineString(zone.geometry.coordinates);
      distM = turf.pointToLineDistance(pt, line, { units: "meters" });
    }

    if (distM < minDistanceMeters) {
      minDistanceMeters = distM;
      nearestZone = zone;
    }
  }

  if (minDistanceMeters <= maxDistanceMeters && nearestZone) {
    return { zone: nearestZone, distanceMeters: minDistanceMeters };
  }

  return { zone: null, distanceMeters: minDistanceMeters };
}

/**
 * Add a new validated citizen report into the shared runtime store
 */
export function addReport(report: Report): void {
  runtimeReports.push(report);
}

/**
 * Update report status (e.g., Open -> Assigned -> Cleared)
 */
export function updateReportStatus(reportId: string, status: "open" | "assigned" | "cleared"): Report | null {
  const index = runtimeReports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;
  runtimeReports[index] = {
    ...runtimeReports[index],
    status,
  };
  return runtimeReports[index];
}
