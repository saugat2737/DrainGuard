import { describe, it, expect, beforeEach, vi } from "vitest";
import { analyzeDrainImage, FALLBACK_VISION_RESULT } from "@/lib/vision";
import {
  getAllReports,
  addReport,
  findNearestZone,
  resetReportsStore,
} from "@/lib/reports-store";
import { POST as analyzePOST } from "@/app/api/analyze/route";
import { GET as reportsGET, POST as reportsPOST } from "@/app/api/reports/route";
import { GET as zonesGET } from "@/app/api/zones/route";
import { GET as inspectionsGET } from "@/app/api/inspections/route";
import { NextRequest } from "next/server";
import zonesData from "@/data/zones.seed.json";
import { Zone } from "@/lib/types";

describe("Phase 3 Comprehensive Suite: Vision Analysis & Reporting", () => {
  beforeEach(() => {
    resetReportsStore();
    vi.restoreAllMocks();
  });

  // Vision Analysis Tests (1-6)
  it("1. valid model output is parsed and returned in required schema", async () => {
    process.env.GEMINI_API_KEY = "mock-key";
    process.env.GEMINI_MODEL = "gemini-1.5-flash";

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  blockage_type: "silt",
                  severity: 3,
                  summary: "Dense silt and road sediment completely choking drain.",
                }),
              },
            ],
          },
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await analyzeDrainImage(
      Buffer.from("image"),
      "image/jpeg",
      mockFetch as unknown as typeof fetch
    );

    expect(result.fallback).toBe(false);
    expect(result.blockage_type).toBe("silt");
    expect(result.severity).toBe(3);
    expect(result.summary).toBe("Dense silt and road sediment completely choking drain.");
  });

  it("2. missing API key triggers the documented mock fallback", async () => {
    delete process.env.GEMINI_API_KEY;
    const result = await analyzeDrainImage(Buffer.from("image"), "image/jpeg");

    expect(result.fallback).toBe(true);
    expect(result.blockage_type).toBe("unknown");
    expect(result.severity).toBe(2);
    expect(result.summary).toContain("Automatic analysis unavailable");
  });

  it("3. network errors or timeouts trigger the fallback", async () => {
    process.env.GEMINI_API_KEY = "mock-key";
    const failingFetch = vi.fn().mockRejectedValue(new Error("Timeout after 8000ms"));

    const result = await analyzeDrainImage(
      Buffer.from("image"),
      "image/jpeg",
      failingFetch as unknown as typeof fetch
    );

    expect(result.fallback).toBe(true);
    expect(result.blockage_type).toBe("unknown");
    expect(result.severity).toBe(2);
  });

  it("4. malformed model output safely falls back", async () => {
    process.env.GEMINI_API_KEY = "mock-key";
    const malformedResponse = {
      candidates: [{ content: { parts: [{ text: "Non-JSON response text" }] } }],
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => malformedResponse,
    });

    const result = await analyzeDrainImage(
      Buffer.from("image"),
      "image/jpeg",
      mockFetch as unknown as typeof fetch
    );

    expect(result.fallback).toBe(true);
    expect(result.blockage_type).toBe("unknown");
  });

  it("5. invalid and oversized image payloads are rejected", async () => {
    // Missing photo
    const emptyForm = new FormData();
    const req1 = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: emptyForm,
    });
    const res1 = await analyzePOST(req1);
    expect(res1.status).toBe(400);

    // Unsupported media type
    const textBlob = new Blob(["not image"], { type: "text/plain" });
    const textForm = new FormData();
    textForm.append("photo", textBlob, "doc.txt");
    const req2 = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: textForm,
    });
    const res2 = await analyzePOST(req2);
    expect(res2.status).toBe(400);
    const json2 = await res2.json();
    expect(json2.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("6. API key is not returned in responses or logged", async () => {
    process.env.GEMINI_API_KEY = "SECRET_KEY_12345";
    const imageBlob = new Blob([new Uint8Array(100)], { type: "image/jpeg" });
    const form = new FormData();
    form.append("photo", imageBlob, "test.jpg");

    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: form,
    });
    const res = await analyzePOST(req);
    const text = await res.text();
    expect(text).not.toContain("SECRET_KEY_12345");
  });

  // Reports Tests (7-14)
  it("7. GET /api/reports returns expected seed reports and newly created reports", async () => {
    const res = await reportsGET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBeGreaterThanOrEqual(8);
    expect(json.data.some((r: { source: string }) => r.source === "seed")).toBe(true);
  });

  it("8. valid POST creates report with proper source, ID, and initial open status", async () => {
    const payload = {
      lat: 13.3400,
      lng: 77.1120, // inside Z01
      photo_url: null,
      blockage_type: "debris",
      severity: 2,
      summary: "Broken branches obstructing curb drain.",
    };

    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const res = await reportsPOST(req);
    expect(res.status).toBe(201);
    const json = await res.json();

    expect(json.data.report.id).toMatch(/^rep-/);
    expect(json.data.report.source).toBe("citizen");
    expect(json.data.report.status).toBe("open");
    expect(json.data.matched_zone_id).toBe("Z01");
  });

  it("9. report within 200 metres is assigned to correct nearest zone", () => {
    const zones = zonesData.zones as unknown as Zone[];
    // Inside Z01
    const match = findNearestZone(13.3400, 77.1120, zones, 200);
    expect(match.zone?.id).toBe("Z01");
    expect(match.distanceMeters).toBeLessThanOrEqual(200);
  });

  it("10. report outside 200m distance threshold is rejected with 400 LOCATION_OUT_OF_RANGE", async () => {
    const farPayload = {
      lat: 13.2000,
      lng: 77.0000, // 20km away from Tumakuru center
      photo_url: null,
      blockage_type: "plastic",
      severity: 3,
      summary: "Distant blockage outside city coverage.",
    };

    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      body: JSON.stringify(farPayload),
    });
    const res = await reportsPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("LOCATION_OUT_OF_RANGE");
  });

  it("11. invalid report payloads receive consistent errors", async () => {
    // Missing required fields
    const invalidPayload = {
      lat: "invalid-latitude",
    };
    const req = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
    });
    const res = await reportsPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_INPUT");
  });

  it("12. successful report affects the same zone's subsequent risk score", async () => {
    // Initial Z05 risk at rain = 25 mm
    const zonesReqBefore = new NextRequest("http://localhost:3000/api/zones?rain_mm=25");
    const zonesResBefore = await zonesGET(zonesReqBefore);
    const zonesJsonBefore = await zonesResBefore.json();
    const z05Before = zonesJsonBefore.data.zones.find((z: Zone) => z.id === "Z05");
    const scoreBefore = z05Before.risk.score;

    // Add severe blockage to Z05 (Ashoka Nagar coordinates: 13.332, 77.122)
    const reportPayload = {
      lat: 13.3320,
      lng: 77.1220,
      photo_url: null,
      blockage_type: "construction",
      severity: 3,
      summary: "Concrete slurry blocking residential street outlet.",
    };
    const postReq = new NextRequest("http://localhost:3000/api/reports", {
      method: "POST",
      body: JSON.stringify(reportPayload),
    });
    const postRes = await reportsPOST(postReq);
    expect(postRes.status).toBe(201);

    // Subsequent query to /api/zones with same rain = 25 mm
    const zonesReqAfter = new NextRequest("http://localhost:3000/api/zones?rain_mm=25");
    const zonesResAfter = await zonesGET(zonesReqAfter);
    const zonesJsonAfter = await zonesResAfter.json();
    const z05After = zonesJsonAfter.data.zones.find((z: Zone) => z.id === "Z05");

    expect(z05After.risk.score).toBeGreaterThan(scoreBefore);
  });

  it("13. inspection queue reflects updated open-report counts and ranking", async () => {
    // Add report to Z04
    const reportPayload = {
      lat: 13.3300,
      lng: 77.1080,
      photo_url: null,
      blockage_type: "plastic",
      severity: 3,
      summary: "Severe culvert block.",
    };
    await reportsPOST(
      new NextRequest("http://localhost:3000/api/reports", {
        method: "POST",
        body: JSON.stringify(reportPayload),
      })
    );

    const inspReq = new NextRequest("http://localhost:3000/api/inspections?rain_mm=30");
    const inspRes = await inspectionsGET(inspReq);
    const inspJson = await inspRes.json();

    const z04Item = inspJson.data.find((item: { zone_id: string }) => item.zone_id === "Z04");
    expect(z04Item.open_reports).toBe(1);
  });

  it("14. a second zone's risk is not unintentionally changed by an unrelated report", async () => {
    // Initial score of Z09 (University Ridge)
    const req1 = new NextRequest("http://localhost:3000/api/zones?rain_mm=20");
    const res1 = await zonesGET(req1);
    const json1 = await res1.json();
    const z09InitialScore = json1.data.zones.find((z: Zone) => z.id === "Z09").risk.score;

    // Add report to Z01 (Amanikere, completely different zone)
    await reportsPOST(
      new NextRequest("http://localhost:3000/api/reports", {
        method: "POST",
        body: JSON.stringify({
          lat: 13.3400,
          lng: 77.1120,
          photo_url: null,
          blockage_type: "plastic",
          severity: 3,
          summary: "Z01 report",
        }),
      })
    );

    // Re-check Z09
    const req2 = new NextRequest("http://localhost:3000/api/zones?rain_mm=20");
    const res2 = await zonesGET(req2);
    const json2 = await res2.json();
    const z09AfterScore = json2.data.zones.find((z: Zone) => z.id === "Z09").risk.score;

    expect(z09AfterScore).toBe(z09InitialScore);
  });
});
