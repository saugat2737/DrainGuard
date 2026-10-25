import { Report, Zone } from "./types";
import seedReportsData from "@/data/reports.seed.json";
import * as turf from "@turf/turf";
import { getReportsRepository, IReportsRepository, InMemoryReportsRepository } from "./reports-repository";

/**
 * Backward-Compatible Reports Store Adapter
 * Provides async repository access while preserving pure spatial helpers (findNearestZone).
 */

export function getRepository(): IReportsRepository {
  return getReportsRepository();
}

/**
 * Synchronous in-memory helper for test reset
 */
export function resetReportsStore(includeDemoSeeds = true): void {
  const repo = getReportsRepository();
  if (repo instanceof InMemoryReportsRepository) {
    repo.reset(includeDemoSeeds);
  } else if ((globalThis as any).__DRAINGUARD_MEM_REPO__) {
    ((globalThis as any).__DRAINGUARD_MEM_REPO__ as InMemoryReportsRepository).reset(includeDemoSeeds);
  }
}

/**
 * Synchronous in-memory helper for test suites loading seeds
 */
export function loadSeedReports(): void {
  resetReportsStore(true);
}

/**
 * Return all current reports (newest first)
 */
export async function getAllReportsAsync(): Promise<Report[]> {
  const repo = getReportsRepository();
  return repo.getAllReports();
}

/**
 * Synchronous compatibility wrapper
 */
export function getAllReports(): Report[] {
  const repo = getReportsRepository();
  if (repo instanceof InMemoryReportsRepository) {
    return repo.getAllReportsSync();
  }
  return [];
}

/**
 * Add a new validated citizen report
 */
export async function addReport(report: Report): Promise<Report> {
  const repo = getReportsRepository();
  if (repo instanceof InMemoryReportsRepository) {
    return repo.addReportSync(report);
  }
  return repo.addReport(report);
}

/**
 * Retrieve report by ID
 */
export async function getReportById(id: string): Promise<Report | null> {
  const repo = getReportsRepository();
  return repo.getReportById(id);
}

/**
 * Update report status (e.g. municipal dispatch: open -> assigned -> cleared)
 */
export async function updateReportStatus(
  id: string,
  newStatus: Report["status"]
): Promise<Report | null> {
  const repo = getReportsRepository();
  return repo.updateReportStatus(id, newStatus);
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
      if (turf.booleanPointInPolygon(pt, poly)) {
        distM = 0;
      } else {
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
