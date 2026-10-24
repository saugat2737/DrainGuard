import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchPlaces,
  reverseGeocode,
  getLocalSuggestions,
  TUMAKURU_FALLBACK_PRESETS,
  TUMAKURU_CENTROID,
} from "../src/lib/geocoding";

describe("Geocoding Service & Public API Safety", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. returns local suggestions for queries under 2 characters without invoking network", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const result = await searchPlaces("a");

    expect(result.places.length).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();

    const emptySuggestions = getLocalSuggestions("");
    expect(emptySuggestions.length).toBeGreaterThanOrEqual(4);
    expect(emptySuggestions[0].city).toBe("Tumakuru");
  });

  it("2. parses Photon GeoJSON feature geometry and correctly converts [lon, lat] to [lat, lng]", async () => {
    const mockPhotonResponse = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [77.1025, 13.3411], // [lon, lat]
          },
          properties: {
            osm_type: "W",
            osm_id: 400940812,
            name: "Tumkur KSRTC Bus Stand",
            street: "KSRTC Link Road",
            city: "Tumakuru",
            state: "Karnataka",
            postcode: "572101",
          },
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockPhotonResponse,
    } as Response);

    const result = await searchPlaces("Tumkur Bus Stand", { limit: 5 });

    expect(result.provider).toBe("photon");
    expect(result.places.length).toBe(1);
    const place = result.places[0];
    expect(place.name).toBe("Tumkur KSRTC Bus Stand");
    // Verified coordinate flip
    expect(place.lat).toBe(13.3411);
    expect(place.lng).toBe(77.1025);
    expect(place.displayName).toContain("KSRTC Link Road");
    expect(place.displayName).toContain("Tumakuru");
  });

  it("3. passes Tumakuru centroid location bias to Photon API request URL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    } as Response);

    await searchPlaces("Siddaganga", { limit: 4 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchSpy.mock.calls[0][0] as string;

    // Checks presence of lat and lon bias matching Tumakuru centroid
    expect(requestedUrl).toContain("lat=13.3392");
    expect(requestedUrl).toContain("lon=77.114");
    expect(requestedUrl).toContain("location_bias_scale=0.3");
    expect(requestedUrl).toContain("limit=4");
  });

  it("4. falls back gracefully to local Tumakuru landmarks when upstream geocoder fails or network is offline", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network connection lost"));

    const result = await searchPlaces("Railway", { limit: 3 });

    expect(result.provider).toBe("local_fallback");
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.places[0].name).toContain("Railway");
    expect(result.places[0].lat).toBe(13.3465);
    expect(result.places[0].lng).toBe(77.1215);
  });

  it("5. strictly prevents calls to OSM Nominatim for autocomplete requests (Policy Safeguard)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    } as Response);

    await searchPlaces("Tumakuru DC Office");

    const calledUrls = fetchSpy.mock.calls.map((c) => c[0] as string);
    // Explicit safeguard verification: No autocomplete call may target nominatim.openstreetmap.org
    for (const url of calledUrls) {
      expect(url).not.toContain("nominatim.openstreetmap.org");
    }
  });

  it("6. reverse geocodes valid coordinates to structured place with street and locality", async () => {
    const mockReverseResponse = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [77.1075, 13.3382],
          },
          properties: {
            name: "District Commissioner Office",
            street: "Mini Vidhana Soudha Road",
            city: "Tumakuru",
            state: "Karnataka",
          },
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockReverseResponse,
    } as Response);

    const place = await reverseGeocode(13.3382, 77.1075);

    expect(place.lat).toBe(13.3382);
    expect(place.lng).toBe(77.1075);
    expect(place.name).toBe("District Commissioner Office");
    expect(place.displayName).toContain("Mini Vidhana Soudha Road");
  });

  it("7. reverse geocoding falls back to nearest known landmark if geocoder fails or coordinate is remote", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("504 Gateway Timeout"));

    // Coordinate right next to Tumakuru Railway Station
    const place = await reverseGeocode(13.34655, 77.12152);

    expect(place.lat).toBe(13.34655);
    expect(place.lng).toBe(77.12152);
    expect(place.name).toContain("Tumakuru Railway Station");
  });
});
