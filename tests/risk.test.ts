import { describe, it, expect } from "vitest";
import {
  calculateZoneRisk,
  calculateRainFactor,
  calculateBlockageFactor,
  getRiskLevel,
  RISK_WEIGHTS,
} from "@/lib/risk";
import { Zone, Report } from "@/lib/types";

describe("Risk Engine pure unit tests", () => {
  const baseZone: Zone = {
    id: "TEST-Z01",
    name: "Test Lowland Zone",
    geometry: {
      type: "LineString",
      coordinates: [
        [77.11, 13.33],
        [77.12, 13.34],
      ],
    },
    elevation_factor: 0.8,
    history_factor: 0.9,
    simulated: true,
  };

  it("calculates rain factor correctly with 60 mm ceiling", () => {
    expect(calculateRainFactor(0)).toBe(0);
    expect(calculateRainFactor(30)).toBe(0.5);
    expect(calculateRainFactor(60)).toBe(1);
    expect(calculateRainFactor(120)).toBe(1);
  });

  it("calculates blockage factor and accounts for cleared/assigned status weighting", () => {
    const testReports: Report[] = [
      {
        id: "r1",
        lat: 13.33,
        lng: 77.11,
        zone_id: "TEST-Z01",
        photo_url: null,
        blockage_type: "plastic",
        severity: 3,
        summary: "Plastic blockage",
        status: "open",
        source: "seed",
        created_at: new Date().toISOString(),
      },
      {
        id: "r2",
        lat: 13.33,
        lng: 77.11,
        zone_id: "TEST-Z01",
        photo_url: null,
        blockage_type: "silt",
        severity: 2,
        summary: "Silt blockage assigned",
        status: "assigned", // counts 0.5 -> 2 * 0.5 = 1
        source: "seed",
        created_at: new Date().toISOString(),
      },
      {
        id: "r3",
        lat: 13.33,
        lng: 77.11,
        zone_id: "TEST-Z01",
        photo_url: null,
        blockage_type: "debris",
        severity: 3,
        summary: "Cleared blockage",
        status: "cleared", // counts 0
        source: "seed",
        created_at: new Date().toISOString(),
      },
    ];

    // effective severity = 3 (open) + 1 (assigned) + 0 (cleared) = 4
    // blockage factor = min(4 / 6, 1) = 0.6666...
    const result = calculateBlockageFactor(testReports);
    expect(result.factor).toBeCloseTo(4 / 6, 4);
    expect(result.effectiveReportsCount).toBe(2);
    expect(result.blockageTypes).toContain("plastic");
    expect(result.blockageTypes).toContain("silt");
    expect(result.blockageTypes).not.toContain("debris");
  });

  it("multiplies score by 0.3 when rain < 5 mm (rain gating)", () => {
    // When rain is 0 mm (dry day)
    const dryRisk = calculateZoneRisk(baseZone, 0, []);
    // rain = 0, blockage = 0
    // history = 0.9 * 0.20 * 100 = 18
    // elevation = 0.8 * 0.15 * 100 = 12
    // raw = 30; gated = 30 * 0.3 = 9
    expect(dryRisk.score).toBe(9);
    expect(dryRisk.level).toBe("low");

    // When rain is 4.9 mm (still gated)
    const justBelowGateRisk = calculateZoneRisk(baseZone, 4.9, []);
    // rainNorm = 4.9 / 60 = 0.081666... -> 40 * 0.081666 = 3.266
    // raw = 33.266; gated = 33.266 * 0.3 = 9.98 -> 10
    expect(justBelowGateRisk.score).toBe(10);

    // When rain is 5.0 mm (un-gated)
    const atGateRisk = calculateZoneRisk(baseZone, 5.0, []);
    // rainNorm = 5 / 60 = 0.08333... -> 40 * 0.08333 = 3.333
    // raw = 33.333; un-gated = 33
    expect(atGateRisk.score).toBe(33);
    expect(atGateRisk.level).toBe("medium");
  });

  it("matches documented level boundaries: 0–29 low, 30–59 medium, 60–79 high, 80–100 severe", () => {
    expect(getRiskLevel(0)).toBe("low");
    expect(getRiskLevel(29)).toBe("low");
    expect(getRiskLevel(30)).toBe("medium");
    expect(getRiskLevel(59)).toBe("medium");
    expect(getRiskLevel(60)).toBe("high");
    expect(getRiskLevel(79)).toBe("high");
    expect(getRiskLevel(80)).toBe("severe");
    expect(getRiskLevel(100)).toBe("severe");
  });

  it("reaches severe risk on heavy rain with high elevation/history and open blockages", () => {
    const severeReports: Report[] = [
      {
        id: "s1",
        lat: 13.34,
        lng: 77.11,
        zone_id: baseZone.id,
        photo_url: null,
        blockage_type: "plastic",
        severity: 3,
        summary: "Major blockage",
        status: "open",
        source: "seed",
        created_at: new Date().toISOString(),
      },
      {
        id: "s2",
        lat: 13.34,
        lng: 77.11,
        zone_id: baseZone.id,
        photo_url: null,
        blockage_type: "silt",
        severity: 3,
        summary: "Major silt blockage",
        status: "open",
        source: "seed",
        created_at: new Date().toISOString(),
      },
    ];

    // rain = 60mm -> 1.0 (40 pts)
    // blockage = 6/6 -> 1.0 (25 pts)
    // history = 0.9 -> (18 pts)
    // elevation = 0.8 -> (12 pts)
    // total = 95 -> severe
    const risk = calculateZoneRisk(baseZone, 60, severeReports);
    expect(risk.score).toBe(95);
    expect(risk.level).toBe("severe");
    expect(risk.explanation).toContain("Severe risk (95):");
    expect(risk.explanation).toContain("torrential rain");
  });

  it("orders explanation factors strictly by contribution and omits < 10% contributors", () => {
    // rain = 45 mm -> rainNorm = 45/60 = 0.75 -> contrib = 30 pts
    // history = 0.9 -> contrib = 18 pts
    // elevation = 0.8 -> contrib = 12 pts
    // blockage = 0 -> contrib = 0 (omitted since 0 < 10% of total)
    const risk = calculateZoneRisk(baseZone, 45, []);
    expect(risk.score).toBe(60);
    expect(risk.level).toBe("high");

    // Factors >= 6.0 pts: rain (30), history (18), elevation (12)
    // Blockage (0 pts) must be omitted
    expect(risk.explanation).toContain("heavy rain forecast (45 mm)");
    expect(risk.explanation).toContain("frequent past waterlogging");
    expect(risk.explanation).toContain("low-lying street");
    expect(risk.explanation).not.toContain("no active blockage reports");

    // Rain contribution > history > elevation
    const rainIndex = risk.explanation.indexOf("heavy rain");
    const historyIndex = risk.explanation.indexOf("past waterlogging");
    const elevationIndex = risk.explanation.indexOf("low-lying");
    expect(rainIndex).toBeLessThan(historyIndex);
    expect(historyIndex).toBeLessThan(elevationIndex);
  });

  it("is purely deterministic: identical inputs yield identical outputs", () => {
    const run1 = calculateZoneRisk(baseZone, 35, []);
    const run2 = calculateZoneRisk(baseZone, 35, []);
    expect(run1).toEqual(run2);
  });

  it("handles empty zones and 0 inputs safely", () => {
    const zeroZone: Zone = {
      id: "Z_ZERO",
      name: "Zero Risk Zone",
      geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      elevation_factor: 0,
      history_factor: 0,
      simulated: true,
    };
    const zeroRisk = calculateZoneRisk(zeroZone, 0, []);
    expect(zeroRisk.score).toBe(0);
    expect(zeroRisk.level).toBe("low");
    expect(zeroRisk.explanation).toContain("Low risk (0):");
  });
});
