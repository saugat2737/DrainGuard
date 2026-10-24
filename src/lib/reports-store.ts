import { Report, Zone } from "./types";
import seedReportsData from "@/data/reports.seed.json";
import * as turf from "@turf/turf";

/**
 * Production-Hardened Citizen Report Store
 *
 * PRODUCTION DATA POLICY:
 * In live production environments (`ENABLE_DEMO_REPORTS !== "true"` and `NODE_ENV === "production"`),
 * the store initializes completely clean with 0 synthetic seed reports.
 * Simulated or demonstration reports are strictly opt-in development fixtures.
 */

function isDemoModeEnabled(): boolean {
  // In production, demo reports are disabled by default
  if (process.env.NODE_ENV === "production") {
    return process.env.ENABLE_DEMO_REPORTS === "true";
  }
  // In test and development environments, demo seed fixtures are enabled by default for QA continuity
  return process.env.DISABLE_DEMO_REPORTS !== "true";
}

let runtimeReports: Report[] = isDemoModeEnabled()
  ? [...(seedReportsData.reports as unknown as Report[])]
  : [];

/**
 * Reset store (supports explicit fixture loading for test suites)
 */
export function resetReportsStore(includeDemoSeeds = isDemoModeEnabled()): void {
  runtimeReports = includeDemoSeeds
    ? [...(seedReportsData.reports as unknown as Report[])]
    : [];
}

/**
 * Load seed demo fixtures explicitly (for QA test suites)
 */
export function loadSeedReports(): void {
  runtimeReports = [...(seedReportsData.reports as unknown as Report[])];
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
 * Retrieve report by ID
 */
export function getReportById(id: string): Report | null {
  return runtimeReports.find((r) => r.id === id) || null;
}

/**
 * Update report status (e.g. municipal dispatch: open -> assigned -> in_progress -> resolved)
 */
export function updateReportStatus(
  id: string,
  newStatus: Report["status"]
): Report | null {
  const report = runtimeReports.find((r) => r.id === id);
  if (!report) return null;
  report.status = newStatus;
  return report;
}
