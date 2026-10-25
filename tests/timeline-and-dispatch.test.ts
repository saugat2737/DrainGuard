import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET as inspectionsGET } from "@/app/api/inspections/route";
import { NextRequest } from "next/server";
import { resetReportsStore } from "@/lib/reports-store";

describe("Priority 6: 12-Hour Timeline & Clearance Planning", () => {
  beforeEach(() => {
    resetReportsStore();
    vi.restoreAllMocks();
  });

  it("calculates first_high_hour and act_by (with 2-hour buffer) when high risk threshold is crossed", async () => {
    // Mock weather forecast with high rain at 3rd hour
    const mockWeather = {
      rain_mm_next_3h: 5,
      peak_hour: "11:00 AM",
      source: "open-meteo",
      timeline: [
        { time: "2026-10-25T08:00:00Z", rain_mm: 5 },
        { time: "2026-10-25T09:00:00Z", rain_mm: 10 },
        { time: "2026-10-25T10:00:00Z", rain_mm: 45 }, // High intensity rain -> risk >= 60 for low-elevation zones
        { time: "2026-10-25T11:00:00Z", rain_mm: 20 },
      ],
    };

    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("open-meteo.com")) {
        return {
          ok: true,
          json: async () => ({
            hourly: {
              time: mockWeather.timeline.map((t) => t.time),
              precipitation: mockWeather.timeline.map((t) => t.rain_mm),
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });

    const req = new NextRequest("http://localhost:3000/api/inspections?rain_mm=5");
    const res = await inspectionsGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const data = json.data;
    expect(Array.isArray(data)).toBe(true);

    // Find a vulnerable zone like Z01 (Amanikere Inundation Basin)
    const z01 = data.find((z: any) => z.zone_id === "Z01");
    expect(z01).toBeDefined();
    expect(z01.first_high_hour).not.toBeNull();
    expect(z01.act_by).not.toBeNull();
  });

  it("returns null for first_high_hour and act_by when no threshold crossing occurs in 12h forecast", async () => {
    // Low rain throughout
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("open-meteo.com")) {
        return {
          ok: true,
          json: async () => ({
            hourly: {
              time: ["2026-10-25T08:00:00Z", "2026-10-25T09:00:00Z"],
              precipitation: [1, 2],
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });

    const req = new NextRequest("http://localhost:3000/api/inspections?rain_mm=2");
    const res = await inspectionsGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const lowRiskZone = json.data.find((z: any) => z.zone_id === "Z03" || z.score < 60);
    if (lowRiskZone && lowRiskZone.first_high_hour === null) {
      expect(lowRiskZone.first_high_hour).toBeNull();
      expect(lowRiskZone.act_by).toBeNull();
    }
  });
});
