import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getWeatherForecast,
  resetWeatherCache,
  setCachedWeather,
} from "@/lib/weather";
import { GET as weatherGET } from "@/app/api/weather/route";
import { GET as zonesGET } from "@/app/api/zones/route";
import { GET as inspectionsGET } from "@/app/api/inspections/route";
import { NextRequest } from "next/server";
import zonesData from "@/data/zones.seed.json";
import { calculateZoneRisk } from "@/lib/risk";
import { Zone, Report } from "@/lib/types";
import reportsData from "@/data/reports.seed.json";

describe("Phase 1B API Route Handlers & Weather Integration", () => {
  beforeEach(() => {
    resetWeatherCache();
    vi.restoreAllMocks();
  });

  it("1. /api/weather returns success schema when upstream forecast succeeds", async () => {
    const mockOpenMeteoResponse = {
      hourly: {
        time: [
          "2026-10-24T18:00",
          "2026-10-24T19:00",
          "2026-10-24T20:00",
          "2026-10-24T21:00",
        ],
        precipitation: [5.2, 10.4, 4.4, 1.0],
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    });

    const weather = await getWeatherForecast(mockFetch as unknown as typeof fetch);
    expect(weather.rain_mm_next_3h).toBe(20); // 5.2 + 10.4 + 4.4 = 20.0
    expect(weather.source).toBe("open-meteo");
    expect(typeof weather.peak_hour).toBe("string");

    // Also test GET /api/weather route handler directly
    vi.stubGlobal("fetch", mockFetch);
    const response = await weatherGET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.rain_mm_next_3h).toBe(20);
    expect(body.data.source).toBe("open-meteo");
  });

  it("2. weather timeout or network failure uses cached value when available", async () => {
    setCachedWeather({
      rain_mm_next_3h: 15.5,
      peak_hour: "08:00 PM",
      source: "open-meteo",
    });

    const failingFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
    const weather = await getWeatherForecast(failingFetch as unknown as typeof fetch);

    expect(weather.rain_mm_next_3h).toBe(15.5);
    expect(weather.peak_hour).toBe("08:00 PM");
    expect(weather.source).toBe("cache");
  });

  it("3. weather failure with empty cache returns zero-rain fallback", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("Connection reset"));
    const weather = await getWeatherForecast(failingFetch as unknown as typeof fetch);

    expect(weather.rain_mm_next_3h).toBe(0);
    expect(weather.peak_hour).toBe("N/A");
    expect(weather.source).toBe("cache");
  });

  it("4. /api/zones returns every seeded zone with computed risk result", async () => {
    const req = new NextRequest("http://localhost:3000/api/zones?rain_mm=30");
    const res = await zonesGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.rain_mm).toBe(30);
    expect(json.data.zones).toHaveLength(zonesData.zones.length);

    const firstZone = json.data.zones[0];
    expect(firstZone.risk).toBeDefined();
    expect(typeof firstZone.risk.score).toBe("number");
    expect(["low", "medium", "high", "severe"]).toContain(firstZone.risk.level);
    expect(firstZone.simulated).toBe(true);
  });

  it("5. invalid rain_mm values are rejected consistently with HTTP 400", async () => {
    const negativeReq = new NextRequest("http://localhost:3000/api/zones?rain_mm=-10");
    const negRes = await zonesGET(negativeReq);
    expect(negRes.status).toBe(400);
    const negJson = await negRes.json();
    expect(negJson.error.code).toBe("INVALID_INPUT");

    const excessiveReq = new NextRequest("http://localhost:3000/api/zones?rain_mm=200");
    const excRes = await zonesGET(excessiveReq);
    expect(excRes.status).toBe(400);

    const nonNumberReq = new NextRequest("http://localhost:3000/api/zones?rain_mm=heavy_rain");
    const nonNumRes = await zonesGET(nonNumberReq);
    expect(nonNumRes.status).toBe(400);
  });

  it("6. zone risk score from /api/zones strictly matches the pure risk engine", async () => {
    const rain = 40;
    const req = new NextRequest(`http://localhost:3000/api/zones?rain_mm=${rain}`);
    const res = await zonesGET(req);
    const json = await res.json();

    const z01 = json.data.zones.find((z: Zone) => z.id === "Z01");
    expect(z01).toBeDefined();

    const z01Zone = zonesData.zones.find((z) => z.id === "Z01") as unknown as Zone;
    const z01Reports = (reportsData.reports as unknown as Report[]).filter(
      (r) => r.zone_id === "Z01"
    );
    const directRisk = calculateZoneRisk(z01Zone, rain, z01Reports);

    expect(z01.risk.score).toBe(directRisk.score);
    expect(z01.risk.level).toBe(directRisk.level);
    expect(z01.risk.explanation).toBe(directRisk.explanation);
  });

  it("7. /api/inspections returns all required fields and correct descending order", async () => {
    const req = new NextRequest("http://localhost:3000/api/inspections?rain_mm=50");
    const res = await inspectionsGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.length).toBe(zonesData.zones.length);

    // Verify fields on each item
    for (const item of json.data) {
      expect(typeof item.zone_id).toBe("string");
      expect(typeof item.name).toBe("string");
      expect(typeof item.score).toBe("number");
      expect(["low", "medium", "high", "severe"]).toContain(item.level);
      expect(typeof item.score_at_forecast_peak).toBe("number");
      expect(typeof item.open_reports).toBe("number");
      expect(typeof item.top_reason).toBe("string");
    }

    // Verify descending order
    for (let i = 0; i < json.data.length - 1; i++) {
      const curr = json.data[i];
      const next = json.data[i + 1];
      expect(curr.score).toBeGreaterThanOrEqual(next.score);
      if (curr.score === next.score) {
        expect(curr.open_reports).toBeGreaterThanOrEqual(next.open_reports);
      }
    }
  });

  it("8. open_reports counts only reports with status === 'open'", async () => {
    const req = new NextRequest("http://localhost:3000/api/inspections?rain_mm=20");
    const res = await inspectionsGET(req);
    const json = await res.json();

    // Z06 has rep-003 (open) and rep-007 (cleared) in seed data
    // open_reports for Z06 must be 1
    const z06 = json.data.find((item: { zone_id: string }) => item.zone_id === "Z06");
    expect(z06).toBeDefined();
    expect(z06.open_reports).toBe(1);

    // Z03 has rep-004 (assigned) -> open_reports should be 0
    const z03 = json.data.find((item: { zone_id: string }) => item.zone_id === "Z03");
    expect(z03).toBeDefined();
    expect(z03.open_reports).toBe(0);
  });

  it("9. score_at_forecast_peak uses forecast rainfall independent of manual simulation override", async () => {
    // Set forecast to 0 mm
    setCachedWeather({
      rain_mm_next_3h: 0,
      peak_hour: "12:00 PM",
      source: "open-meteo",
    });

    // Provide high simulation override (80 mm)
    const req = new NextRequest("http://localhost:3000/api/inspections?rain_mm=80");
    const res = await inspectionsGET(req);
    const json = await res.json();

    const z01 = json.data.find((item: { zone_id: string }) => item.zone_id === "Z01");
    // Under 80mm rain, score should be high/severe
    expect(z01.score).toBeGreaterThanOrEqual(70);
    // But score_at_forecast_peak uses 0mm (dry day gated), so it must be significantly lower
    expect(z01.score_at_forecast_peak).toBeLessThan(30);
  });

  it("10. weather failure does not prevent zones or inspections endpoints from working", async () => {
    // Force weather fetch to fail
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Open-Meteo down"))
    );

    // /api/zones with no rain param defaults to weather fallback (0mm)
    const zonesReq = new NextRequest("http://localhost:3000/api/zones");
    const zonesRes = await zonesGET(zonesReq);
    expect(zonesRes.status).toBe(200);
    const zonesJson = await zonesRes.json();
    expect(zonesJson.data.rain_mm).toBe(0);
    expect(zonesJson.data.zones).toHaveLength(10);

    // /api/inspections also succeeds
    const inspReq = new NextRequest("http://localhost:3000/api/inspections");
    const inspRes = await inspectionsGET(inspReq);
    expect(inspRes.status).toBe(200);
    const inspJson = await inspRes.json();
    expect(inspJson.data).toHaveLength(10);
  });
});
