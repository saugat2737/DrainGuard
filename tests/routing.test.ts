import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  scoreRoute,
  compareRoutes,
  fetchOSRMAlternatives,
  ScoredRoute,
} from "@/lib/routing";
import { POST as routePOST } from "@/app/api/route/route";
import { PATCH as reportPatch } from "@/app/api/reports/route";
import { GET as inspectionsGET } from "@/app/api/inspections/route";
import { resetReportsStore, addReport, getAllReports } from "@/lib/reports-store";
import { NextRequest } from "next/server";
import zonesData from "@/data/zones.seed.json";
import { Zone, ZoneRisk } from "@/lib/types";

describe("Phase 4: Routing Engine & Municipal Workflow", () => {
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
        linked_report_ids: [],
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

  it("1. scores route higher when crossing a severe zone compared to avoiding it", () => {
    // Route 1 cuts directly through Z_HIGH ([77.115, 13.325] -> [77.115, 13.345])
    const riskyCoords: [number, number][] = [
      [77.115, 13.325],
      [77.115, 13.345],
    ];
    const scoredRisky = scoreRoute(riskyCoords, 600, 2500, dummyZones);

    // Route 2 bypasses far to the east through safe area ([77.150, 13.325] -> [77.150, 13.345])
    const safeCoords: [number, number][] = [
      [77.150, 13.325],
      [77.150, 13.345],
    ];
    const scoredSafe = scoreRoute(safeCoords, 720, 3100, dummyZones);

    expect(scoredRisky.risk_score).toBeGreaterThan(scoredSafe.risk_score);
    expect(scoredRisky.zones_crossed).toContain("Z_HIGH");
    expect(scoredSafe.zones_crossed).not.toContain("Z_HIGH");
  });

  it("2. recommends safest route when detour adds <= 40% duration", () => {
    const candidateFastest: ScoredRoute = {
      geometry: { type: "LineString", coordinates: [[77.1, 13.3], [77.11, 13.31]] },
      duration_s: 600, // 10 mins
      distance_m: 3000,
      risk_score: 85,
      zones_crossed: ["Z01"],
    };

    const candidateSafest: ScoredRoute = {
      geometry: { type: "LineString", coordinates: [[77.1, 13.3], [77.13, 13.31]] },
      duration_s: 720, // 12 mins (+20% time increase <= 40%)
      distance_m: 3800,
      risk_score: 15,
      zones_crossed: [],
    };

    const comparison = compareRoutes([candidateFastest, candidateSafest]);
    expect(comparison.recommendation).toBe("safest");
    expect(comparison.reason).toContain("Safer detour recommended");
  });

  it("3. switches recommendation to fastest when safest adds > 40% duration", () => {
    const candidateFastest: ScoredRoute = {
      geometry: { type: "LineString", coordinates: [[77.1, 13.3], [77.11, 13.31]] },
      duration_s: 600, // 10 mins
      distance_m: 3000,
      risk_score: 80,
      zones_crossed: ["Z01"],
    };

    const candidateExcessiveDetour: ScoredRoute = {
      geometry: { type: "LineString", coordinates: [[77.1, 13.3], [77.18, 13.35]] },
      duration_s: 960, // 16 mins (+60% increase > 40%)
      distance_m: 6000,
      risk_score: 10,
      zones_crossed: [],
    };

    const comparison = compareRoutes([candidateFastest, candidateExcessiveDetour]);
    expect(comparison.recommendation).toBe("fastest");
    expect(comparison.reason).toContain("exceeding the 40% threshold");
  });

  it("4. POST /api/route returns 400 for invalid coordinates", async () => {
    const invalidReq = new NextRequest("http://localhost:3000/api/route", {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: 100 }, // invalid lat
        destination: { lat: 13.3, lng: 77.1 },
      }),
    });
    const res = await routePOST(invalidReq);
    expect(res.status).toBe(400);
  });

  it("5. POST /api/route handles OSRM failure with ROUTING_UNAVAILABLE 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("OSRM service unreachable"))
    );

    const validReq = new NextRequest("http://localhost:3000/api/route", {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: 13.34, lng: 77.11 },
        destination: { lat: 13.35, lng: 77.12 },
        rain_mm: 20,
      }),
    });

    const res = await routePOST(validReq);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("ROUTING_UNAVAILABLE");
  });

  it("6. Status mutation (PATCH /api/reports) updates report to cleared and lowers zone risk", async () => {
    // Add an open report to Z01
    addReport({
      id: "rep-mutation-test",
      lat: 13.3400,
      lng: 77.1120,
      zone_id: "Z01",
      photo_url: null,
      blockage_type: "plastic",
      severity: 3,
      summary: "Severe drain blockage before clearance",
      status: "open",
      source: "citizen",
      created_at: new Date().toISOString(),
    });

    // Check inspection queue before mutation (Z01 open_reports should include it)
    const inspReq1 = new NextRequest("http://localhost:3000/api/inspections?rain_mm=10");
    const inspRes1 = await inspectionsGET(inspReq1);
    const inspJson1 = await inspRes1.json();
    const z01Before = inspJson1.data.find((z: { zone_id: string }) => z.zone_id === "Z01");
    const scoreBefore = z01Before.score;
    const openBefore = z01Before.open_reports;

    // Mutate status to 'cleared'
    const patchReq = new NextRequest("http://localhost:3000/api/reports", {
      method: "PATCH",
      body: JSON.stringify({
        id: "rep-mutation-test",
        status: "cleared",
      }),
    });
    const patchRes = await reportPatch(patchReq);
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.data.status).toBe("cleared");

    // Check inspection queue after mutation
    const inspReq2 = new NextRequest("http://localhost:3000/api/inspections?rain_mm=10");
    const inspRes2 = await inspectionsGET(inspReq2);
    const inspJson2 = await inspRes2.json();
    const z01After = inspJson2.data.find((z: { zone_id: string }) => z.zone_id === "Z01");

    // Cleared report counts 0 towards blockage factor, lowering the score and reducing open_reports
    expect(z01After.open_reports).toBe(openBefore - 1);
    expect(z01After.score).toBeLessThanOrEqual(scoreBefore);
  });
});
