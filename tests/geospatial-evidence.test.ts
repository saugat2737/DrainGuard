import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  scoreRoute,
  compareRoutes,
  fetchOSRMAlternatives,
  ScoredRoute,
} from "@/lib/routing";
import { POST as routePOST } from "@/app/api/route/route";
import { resetReportsStore, addReport, getAllReports } from "@/lib/reports-store";
import { getAntecedentRainfall, resetWeatherCache } from "@/lib/weather";
import { NextRequest } from "next/server";
import zonesData from "@/data/zones.seed.json";
import { Zone, ZoneRisk } from "@/lib/types";

describe("Geospatial Evidence Engine & Grounded Flood-Zone Verification", () => {
  beforeEach(() => {
    resetReportsStore();
    resetWeatherCache();
    vi.restoreAllMocks();
  });

  const dummyGroundedZones: (Zone & { risk: ZoneRisk })[] = [
    {
      id: "Z_BASIN",
      name: "Amanikere Inundation Basin",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.1080, 13.3420],
            [77.1140, 13.3440],
            [77.1160, 13.3390],
            [77.1100, 13.3370],
            [77.1080, 13.3420],
          ],
        ],
      },
      elevation_factor: 0.85,
      history_factor: 0.90,
      simulated: true,
      basis: "hydrological_basin",
      geographic_justification: "Lake contour depression ~812m MSL",
      risk: {
        zone_id: "Z_BASIN",
        score: 85,
        level: "severe",
        factors: [],
        explanation: "Severe basin inundation risk",
        linked_report_ids: [],
      },
    },
    {
      id: "Z_RIDGE",
      name: "Elevated Ridge Bypass",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.1280, 13.3240],
            [77.1340, 13.3260],
            [77.1350, 13.3210],
            [77.1290, 13.3190],
            [77.1280, 13.3240],
          ],
        ],
      },
      elevation_factor: 0.15,
      history_factor: 0.10,
      simulated: true,
      basis: "elevated_ridge",
      geographic_justification: "Natural ridge shedding run-off ~842m MSL",
      risk: {
        zone_id: "Z_RIDGE",
        score: 15,
        level: "low",
        factors: [],
        explanation: "Low ridge risk",
        linked_report_ids: [],
      },
    },
  ];

  it("1. validates that every seed zone fixture contains GeoJSON coordinates, valid ring closures, and geographic justification", () => {
    const zones = zonesData.zones as unknown as Zone[];
    expect(zones.length).toBe(10);

    for (const zone of zones) {
      expect(zone.id).toBeDefined();
      expect(zone.name).toBeDefined();
      expect(zone.basis).toBeDefined();
      expect(zone.geographic_justification).toBeDefined();

      if (zone.geometry.type === "Polygon") {
        const ring = zone.geometry.coordinates[0];
        expect(ring.length).toBeGreaterThanOrEqual(4);
        // GeoJSON standard: first and last coordinates must be identical
        const first = ring[0];
        const last = ring[ring.length - 1];
        expect(first[0]).toBeCloseTo(last[0], 4);
        expect(first[1]).toBeCloseTo(last[1], 4);

        // Longitude in Karnataka ~ 77.1, Latitude ~ 13.3
        for (const pt of ring) {
          expect(pt[0]).toBeGreaterThan(77.0);
          expect(pt[0]).toBeLessThan(77.3);
          expect(pt[1]).toBeGreaterThan(13.2);
          expect(pt[1]).toBeLessThan(13.5);
        }
      } else if (zone.geometry.type === "LineString") {
        expect(zone.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
        for (const pt of zone.geometry.coordinates) {
          expect(pt[0]).toBeGreaterThan(77.0);
          expect(pt[0]).toBeLessThan(77.3);
          expect(pt[1]).toBeGreaterThan(13.2);
          expect(pt[1]).toBeLessThan(13.5);
        }
      }
    }
  });

  it("2. evaluates 3 distinct evidence checks on route scoring (Rainfall, Previous Rain/History, Baseline Traffic)", () => {
    const routeCoords: [number, number][] = [
      [77.1120, 13.3400],
      [77.1130, 13.3420],
    ];

    const scored = scoreRoute(routeCoords, 600, 2000, dummyGroundedZones, 35, {
      past_24h_mm: 18.2,
      past_72h_mm: 42.0,
      past_7d_mm: 65.5,
      source: "open-meteo-historical",
      period_start: "2026-10-17",
      period_end: "2026-10-24",
      is_complete: true,
    });

    expect(scored.evidence_check).toBeDefined();
    expect(scored.evidence_check?.current_forecast_rain.rain_mm).toBe(35);
    expect(scored.evidence_check?.antecedent_and_history.past_24h_mm).toBe(18.2);
    expect(scored.evidence_check?.antecedent_and_history.historical_flood_records_status).toBe("unavailable_locally");
    expect(scored.evidence_check?.traffic_feasibility.status).toBe("baseline_estimates_only");
  });

  it("3. fetches antecedent historical rainfall correctly from mock archive API", async () => {
    const mockArchiveFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: Array.from({ length: 168 }, (_, i) => `2026-10-18T${i}:00:00Z`),
          precipitation: Array.from({ length: 168 }, () => 0.5), // 0.5mm each hour
        },
      }),
    });

    const result = await getAntecedentRainfall(mockArchiveFetch as any);
    expect(result.is_complete).toBe(true);
    expect(result.source).toBe("open-meteo-historical");
    expect(result.past_24h_mm).toBeCloseTo(12.0, 1); // 24 * 0.5 = 12
    expect(result.past_7d_mm).toBeCloseTo(84.0, 1); // 168 * 0.5 = 84
  });

  it("4. gracefully handles missing historical archive data without crashing or inventing zero rain", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("Archive connection timeout"));
    const result = await getAntecedentRainfall(failingFetch as any);

    expect(result.is_complete).toBe(false);
    expect(result.source).toBe("unavailable");
  });

  it("5. strictly adheres to zero-cost policy: live traffic is marked unavailable without paid keys", async () => {
    const routeReq = new NextRequest("http://localhost:3000/api/route", {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: 13.3465, lng: 77.1215 },
        destination: { lat: 13.3290, lng: 77.1080 },
        rain_mm: 10,
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
              duration: 500,
              distance: 3000,
            },
          ],
        }),
      })
    );

    const res = await routePOST(routeReq);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.data.traffic_status.is_live).toBe(false);
    expect(json.data.traffic_status.note).toContain("baseline driving speeds without live congestion");
  });
});
