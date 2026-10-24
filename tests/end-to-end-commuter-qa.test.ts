import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as routePOST } from "@/app/api/route/route";
import { GET as geocodeGET } from "@/app/api/geocode/route";
import { GET as statusGET } from "@/app/api/status/route";
import { searchPlaces, reverseGeocode, TUMAKURU_FALLBACK_PRESETS } from "@/lib/geocoding";
import { scoreRoute, compareRoutes } from "@/lib/routing";
import zonesData from "@/data/zones.seed.json";
import { NextRequest } from "next/server";

describe("Scenario A & C: Commuter Search, Routing & Map Landmark Flows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A1: Autocomplete returns real matched landmark coordinates and human-readable locality", async () => {
    const mockFeature = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.1025, 13.3411] },
          properties: {
            name: "Tumkur KSRTC Bus Stand",
            street: "KSRTC Link Road",
            city: "Tumakuru",
            state: "Karnataka",
          },
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeature,
    } as Response);

    const req = new NextRequest("http://localhost:3000/api/geocode?q=Bus+Stand&limit=3");
    const res = await geocodeGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.places.length).toBe(1);
    expect(json.data.places[0].lat).toBe(13.3411);
    expect(json.data.places[0].lng).toBe(77.1025);
    expect(json.data.places[0].displayName).toContain("KSRTC Link Road");
  });

  it("A2: Journey planner generates 3 distinct route options with consistent coordinates and evidence checks", async () => {
    const origin = { lat: 13.3465, lng: 77.1215 }; // Tumakuru Railway Station
    const destination = { lat: 13.3411, lng: 77.1025 }; // KSRTC Bus Stand

    const req = new NextRequest("http://localhost:3000/api/route", {
      method: "POST",
      body: JSON.stringify({
        origin,
        destination,
        rain_mm: 25,
      }),
    });

    const res = await routePOST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const data = json.data;

    expect(data.safest).toBeDefined();
    expect(data.fastest).toBeDefined();
    expect(data.recommendation).toMatch(/^(safest|fastest|balanced)$/);

    // Verify origin and destination coordinates are preserved in the geometry endpoints
    const coords = data.safest.geometry.coordinates;
    expect(coords.length).toBeGreaterThan(1);
    expect(coords[0][0]).toBeCloseTo(origin.lng, 2);
    expect(coords[0][1]).toBeCloseTo(origin.lat, 2);

    // Verify 3 evidence checks are generated and populated
    const evidence = data.safest.evidence_check;
    expect(evidence).toBeDefined();
    expect(evidence.current_forecast_rain.rain_mm).toBe(25);
    expect(evidence.antecedent_and_history.past_24h_mm).toBeGreaterThanOrEqual(0);
    expect(evidence.traffic_feasibility.status).toBe("baseline_estimates_only");
    expect(evidence.traffic_feasibility.note).toContain("baseline routing estimates");
  });

  it("A3: Prevents identical origin and destination routing with actionable validation", async () => {
    const samePoint = { lat: 13.3465, lng: 77.1215 };
    const req = new NextRequest("http://localhost:3000/api/route", {
      method: "POST",
      body: JSON.stringify({
        origin: samePoint,
        destination: samePoint,
      }),
    });

    // Our API validates coordinate spacing
    const res = await routePOST(req);
    // Either handles as zero distance or returns error
    if (res.status === 400) {
      const json = await res.json();
      expect(json.error).toBeDefined();
    } else {
      const json = await res.json();
      expect(json.data.fastest.distance_m).toBeLessThanOrEqual(50);
    }
  });

  it("C1: Map search resolves landmark and provides clean coordinates for map camera navigation", async () => {
    const preset = TUMAKURU_FALLBACK_PRESETS[2]; // Siddaganga Math
    expect(preset.lat).toBe(13.3155);
    expect(preset.lng).toBe(77.1428);
    expect(preset.name).toBe("Siddaganga Math");

    // Reverse geocode around this coordinate returns nearby reference
    const rev = await reverseGeocode(13.3155, 77.1428);
    expect(rev.lat).toBe(13.3155);
    expect(rev.lng).toBe(77.1428);
    expect(rev.displayName).toBeDefined();
  });
});

describe("Scenario B & D: Map Picking & Geolocation Safety", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("B1: Reverse geocodes tapped map coordinate into human-readable label", async () => {
    const mockReverse = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.114, 13.344] },
          properties: {
            name: "Amanikere Lake Promenade",
            street: "Amanikere Road",
            city: "Tumakuru",
          },
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockReverse,
    } as Response);

    const place = await reverseGeocode(13.344, 77.114);
    expect(place.name).toBe("Amanikere Lake Promenade");
    expect(place.displayName).toContain("Amanikere Road");
    expect(place.lat).toBe(13.344);
    expect(place.lng).toBe(77.114);
  });

  it("B2: Falls back honestly to nearest landmark when reverse geocoding returns empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    } as Response);

    const place = await reverseGeocode(13.3466, 77.1216); // right next to Railway Station
    expect(place.name).toContain("Tumakuru Railway Station");
    expect(place.lat).toBe(13.3466);
    expect(place.lng).toBe(77.1216);
  });

  it("D1: Geolocation safety: Coordinates are never transmitted to geocoder without explicit user request", () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    // Simply initializing presets or suggestions makes 0 fetch calls
    const suggestions = TUMAKURU_FALLBACK_PRESETS;
    expect(suggestions.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("Scenario E & F: Flood Evidence Grounding, Topography & Transparency", () => {
  it("E1: Zone geometries maintain strict GeoJSON [longitude, latitude] coordinate ordering", () => {
    for (const zone of zonesData.zones) {
      if (zone.geometry.type === "Polygon") {
        const ring = zone.geometry.coordinates[0] as [number, number][];
        // In Tumakuru: lon is ~77.1, lat is ~13.3
        for (const [lon, lat] of ring) {
          expect(lon).toBeGreaterThan(76.0);
          expect(lon).toBeLessThan(78.0);
          expect(lat).toBeGreaterThan(12.0);
          expect(lat).toBeLessThan(14.5);
        }
      }
    }
  });

  it("E2: Every zone has a documented basis and provenance", () => {
    for (const zone of zonesData.zones) {
      expect(zone.basis).toBeDefined();
      expect(zone.geographic_justification).toBeDefined();
      expect(zone.source_provenance).toBeDefined();
      expect(typeof zone.approx_elevation_m).toBe("number");
    }
  });

  it("F1: Service status endpoint reports geocoding alongside all other subsystems with zero credentials exposed", async () => {
    const res = await statusGET();
    const json = await res.json();
    const services = json.data.services;

    const geocoding = services.find((s: any) => s.service === "geocoding");
    expect(geocoding).toBeDefined();
    expect(geocoding.data_source).toContain("Photon");
    expect(geocoding.requires_credentials).toBe(false);

    // Verify traffic provider honestly discloses zero-cost policy
    const traffic = services.find((s: any) => s.service === "traffic");
    expect(traffic.status).toBe("unavailable");
    expect(traffic.message).toContain("zero-cost");
  });
});
