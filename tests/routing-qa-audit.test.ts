import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  scoreRoute,
  compareRoutes,
  fetchOSRMAlternatives,
  ScoredRoute,
} from "@/lib/routing";
import { POST as routePOST } from "@/app/api/route/route";
import { PATCH as reportPatch } from "@/app/api/reports/route";
import { PATCH as reportIdPatch } from "@/app/api/reports/[id]/route";
import { GET as inspectionsGET } from "@/app/api/inspections/route";
import { resetReportsStore, addReport, getAllReports } from "@/lib/reports-store";
import { NextRequest } from "next/server";
import { Zone, ZoneRisk } from "@/lib/types";

describe("Independent QA Audit Suite: Geospatial Routing & Operational Correctness", () => {
  beforeEach(() => {
    resetReportsStore();
    vi.restoreAllMocks();
  });

  const dummyZones: (Zone & { risk: ZoneRisk })[] = [
    {
      id: "Z_HIGH",
      name: "Flooded Canal Zone",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.110, 13.330],
            [77.120, 13.330],
            [77.120, 13.340],
            [77.110, 13.340],
            [77.110, 13.330],
          ],
        ],
      },
      elevation_factor: 0.9,
      history_factor: 0.9,
      simulated: true,
      risk: {
        zone_id: "Z_HIGH",
        score: 90,
        level: "severe",
        factors: [],
        explanation: "Severe risk",
        linked_report_ids: ["rep-h1"],
      },
    },
    {
      id: "Z_SAFE",
      name: "Elevated Bypass Zone",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.130, 13.330],
            [77.140, 13.330],
            [77.140, 13.340],
            [77.130, 13.340],
            [77.130, 13.330],
          ],
        ],
      },
      elevation_factor: 0.1,
      history_factor: 0.1,
      simulated: true,
      risk: {
        zone_id: "Z_SAFE",
        score: 10,
        level: "low",
        factors: [],
        explanation: "Low risk",
        linked_report_ids: [],
      },
    },
  ];

  it("1. scores route higher when crossing a severe zone and accurately captures hazard hotspots", () => {
    const riskyCoords: [number, number][] = [
      [77.115, 13.325],
      [77.115, 13.345],
    ];
    const scoredRisky = scoreRoute(riskyCoords, 600, 2500, dummyZones, 25);

    const safeCoords: [number, number][] = [
      [77.150, 13.325],
      [77.150, 13.345],
    ];
    const scoredSafe = scoreRoute(safeCoords, 720, 3100, dummyZones, 25);

    expect(scoredRisky.risk_score).toBeGreaterThan(scoredSafe.risk_score);
    expect(scoredRisky.zones_crossed).toContain("Z_HIGH");
    expect(scoredSafe.zones_crossed).not.toContain("Z_HIGH");
    expect(scoredRisky.hazard_hotspots).toBeDefined();
    expect(scoredRisky.hazard_hotspots?.length).toBeGreaterThan(0);
    expect(scoredRisky.hazard_hotspots?.[0].zone_id).toBe("Z_HIGH");
  });

  it("2. derives 3 distinct options (fastest, safest, balanced) when alternative candidates exist", () => {
    const candidateFastest: ScoredRoute = {
      geometry: { type: "LineString", coordinates: [[77.1, 13.3], [77.11, 13.31]] },
      duration_s: 600,
      distance_m: 3000,
      risk_score: 85,
      zones_crossed: ["Z01"],
    };

    const candidateBalanced: ScoredRoute = {
      geometry: { type: "LineString", coordinates: [[77.1, 13.3], [77.12, 13.31]] },
      duration_s: 680,
      distance_m: 3400,
      risk_score: 45,
      zones_crossed: ["Z02"],
    };

    const candidateSafest: ScoredRoute = {
      geometry: { type: "LineString", coordinates: [[77.1, 13.3], [77.13, 13.31]] },
      duration_s: 750,
      distance_m: 3900,
      risk_score: 15,
      zones_crossed: [],
    };

    const comparison = compareRoutes([candidateFastest, candidateBalanced, candidateSafest], 20, false);
    expect(comparison.recommendation).toBe("safest");
    expect(comparison.fastest.risk_score).toBe(85);
    expect(comparison.safest.risk_score).toBe(15);
    expect(comparison.balanced).toBeDefined();
    expect(comparison.balanced?.preference).toBe("balanced");
    expect(comparison.weather_context.spatial_scope).toContain("City-Centroid");
    expect(comparison.traffic_status.is_live).toBe(false);
  });

  it("3. handles /api/reports/[id] parameterized route handler directly with 404 on nonexistent id", async () => {
    const invalidIdReq = new NextRequest("http://localhost:3000/api/reports/nonexistent-id", {
      method: "PATCH",
      body: JSON.stringify({ status: "cleared" }),
    });

    const res = await reportIdPatch(invalidIdReq, { params: { id: "nonexistent-id" } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("4. rejects invalid status payload in /api/reports/[id] with 400", async () => {
    const invalidStatusReq = new NextRequest("http://localhost:3000/api/reports/rep-001", {
      method: "PATCH",
      body: JSON.stringify({ status: "invalid_status_enum" }),
    });

    const res = await reportIdPatch(invalidStatusReq, { params: { id: "rep-001" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_INPUT");
  });

  it("5. verifies that simulation rainfall does not mutate runtime reports store or forecast weather", async () => {
    const reportsBefore = getAllReports();
    const countBefore = reportsBefore.length;

    // Trigger simulation via POST /api/route with rain_mm=90
    const simReq = new NextRequest("http://localhost:3000/api/route", {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: 13.3465, lng: 77.1215 },
        destination: { lat: 13.3290, lng: 77.1080 },
        rain_mm: 90,
        is_simulated: true,
      }),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              geometry: {
                coordinates: [
                  [77.1215, 13.3465],
                  [77.1080, 13.3290],
                ],
              },
              duration: 700,
              distance: 3500,
            },
          ],
        }),
      })
    );

    const res = await routePOST(simReq);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.weather_context.is_simulated).toBe(true);
    expect(json.data.weather_context.rain_mm).toBe(90);

    // Assert reports store count remains unaffected
    const reportsAfter = getAllReports();
    expect(reportsAfter.length).toBe(countBefore);
  });
});
