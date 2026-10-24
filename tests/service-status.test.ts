import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET as statusGET } from "@/app/api/status/route";
import { resetReportsStore, addReport } from "@/lib/reports-store";
import { setCachedWeather, resetWeatherCache } from "@/lib/weather";
import { getTrafficProviderStatus } from "@/lib/traffic";

describe("Service Status Transparency API & Diagnostic Logic", () => {
  beforeEach(() => {
    resetReportsStore();
    resetWeatherCache();
    vi.restoreAllMocks();
  });

  it("1. returns standard compliant health status report with all monitored subsystems", async () => {
    const res = await statusGET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.environment.city).toContain("Tumakuru");
    expect(json.data.services).toBeInstanceOf(Array);
    expect(json.data.services.length).toBeGreaterThanOrEqual(6);

    const serviceNames = json.data.services.map((s: any) => s.service);
    expect(serviceNames).toContain("weather");
    expect(serviceNames).toContain("antecedent_rainfall");
    expect(serviceNames).toContain("routing");
    expect(serviceNames).toContain("traffic");
    expect(serviceNames).toContain("geocoding");
    expect(serviceNames).toContain("vision_ai");
    expect(serviceNames).toContain("risk_engine");
    expect(serviceNames).toContain("reports_store");
  });

  it("2. strictly conceals API keys or sensitive authorization secrets from status output", async () => {
    // Stub GEMINI_API_KEY into env
    vi.stubEnv("GEMINI_API_KEY", "AIzaSySecretFakeKey12345");
    vi.stubEnv("TOMTOM_API_KEY", "TomTomSecretKeyABC");

    const res = await statusGET();
    const text = await res.text();

    expect(text).not.toContain("AIzaSySecretFakeKey12345");
    expect(text).not.toContain("TomTomSecretKeyABC");
  });

  it("3. honestly marks traffic unavailable and non-connected when no credentials exist", () => {
    vi.stubEnv("TOMTOM_API_KEY", "");
    vi.stubEnv("HERE_API_KEY", "");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");

    const traffic = getTrafficProviderStatus();
    expect(traffic.isLiveTrafficAvailable).toBe(false);
    expect(traffic.provider).toBe("none");
    expect(traffic.message).toContain("Live vehicular traffic data is unavailable");
  });

  it("4. distinguishes live citizen reports from seeded demo fixtures in report storage telemetry", async () => {
    // Add 1 real citizen report
    addReport({
      id: "rep-citizen-test",
      lat: 13.3400,
      lng: 77.1120,
      zone_id: "Z01",
      photo_url: null,
      blockage_type: "debris",
      severity: 2,
      summary: "Citizen logged blockage",
      status: "open",
      source: "citizen",
      created_at: new Date().toISOString(),
    });

    const res = await statusGET();
    const json = await res.json();

    const storeService = json.data.services.find((s: any) => s.service === "reports_store");
    expect(storeService).toBeDefined();
    expect(storeService.data_source).toContain("1 citizen");
    expect(storeService.data_source).toContain("8 verified seed fixtures");
  });

  it("5. reflects cached mode when upstream weather is retrieved from cache", async () => {
    setCachedWeather({
      rain_mm_next_3h: 12.5,
      peak_hour: "04:00 PM",
      source: "cache",
      timeline: [],
    });

    // Make upstream fetch fail so it relies on the cache
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network offline"))
    );

    const res = await statusGET();
    const json = await res.json();

    const weatherService = json.data.services.find((s: any) => s.service === "weather");
    expect(weatherService).toBeDefined();
    expect(weatherService.status).toBe("cached");
    expect(weatherService.mode).toBe("cache_fallback");
  });
});
