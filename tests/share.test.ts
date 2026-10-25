import { describe, it, expect } from "vitest";
import {
  generateWhatsAppAlertText,
  generateWhatsAppShareUrl,
  generateMunicipalDispatchOrder,
} from "@/lib/share";
import { Zone, ZoneRisk, Report } from "@/lib/types";

describe("Share & Dispatch Automation (Priority 5)", () => {
  const dummyZone: Zone = {
    id: "Z01",
    name: "Amanikere Inundation Basin",
    geometry: {
      type: "LineString",
      coordinates: [[77.112, 13.34], [77.115, 13.345]],
    },
    elevation_factor: 0.85,
    history_factor: 0.7,
    simulated: false,
    basis: "hydrological_basin",
    approx_elevation_m: 818,
  };

  const dummyRisk: ZoneRisk = {
    zone_id: "Z01",
    score: 75,
    level: "high",
    explanation: "Heavy rainfall coupled with natural depression causes water accumulation.",
    linked_report_ids: ["rep-01"],
    factors: [
      { key: "rain", value: 0.8, weight: 0.4, contribution: 32, text: "High rain intensity" },
      { key: "elevation", value: 0.85, weight: 0.2, contribution: 17, text: "Low elevation bowl" },
    ],
  };

  const dummyReports: Report[] = [
    {
      id: "rep-01",
      lat: 13.341,
      lng: 77.113,
      zone_id: "Z01",
      photo_url: null,
      blockage_type: "plastic",
      severity: 3,
      summary: "Culvert mouth clogged with beverage bottles",
      status: "open",
      source: "citizen",
      created_at: "2026-10-25T07:00:00Z",
    },
  ];

  it("generates structured WhatsApp alert text and wa.me URL for citizens", () => {
    const text = generateWhatsAppAlertText({
      zone: dummyZone,
      risk: dummyRisk,
    });

    expect(text).toContain("⚠️ *DrainGuard Waterlogging Alert — Amanikere Inundation Basin*");
    expect(text).toContain("*Risk Level:* HIGH (75/100)");
    expect(text).toContain("Avoid low-lying underpasses");

    const url = generateWhatsAppShareUrl({
      zone: dummyZone,
      risk: dummyRisk,
    });

    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("DrainGuard Waterlogging Alert"));
  });

  it("includes alternative detour advice in WhatsApp alert when provided", () => {
    const text = generateWhatsAppAlertText({
      zone: dummyZone,
      risk: dummyRisk,
      alternativeRoute: {
        geometry: { type: "LineString", coordinates: [] },
        duration_s: 600,
        distance_m: 3000,
        risk_score: 20,
        zones_crossed: [],
        delay_vs_fastest_s: 180,
        preference: "safest",
      },
    });

    expect(text).toContain("*Alternative Recommended:* safest corridor (adds ~3m, avoids high hazard choke point)");
  });

  it("generates concise municipal dispatch order with clear action deadlines", () => {
    const order = generateMunicipalDispatchOrder({
      zone: dummyZone,
      risk: dummyRisk,
      reports: dummyReports,
      firstHighHour: "10:00 AM",
      actBy: "08:00 AM",
    });

    expect(order).toContain("=== MUNICIPAL DRAINAGE DISPATCH ORDER ===");
    expect(order).toContain("Target Zone: Amanikere Inundation Basin (Z01)");
    expect(order).toContain("Calculated Exposure: 75/100 [HIGH]");
    expect(order).toContain("CLEARANCE DEADLINE (Act-By): 08:00 AM (2h safety clearance window)");
    expect(order).toContain("Debris & Choke Point Inspection Backlog:");
    expect(order).toContain("rep-01 | Severity: 3/3 | Type: PLASTIC");
  });
});
