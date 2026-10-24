import { describe, it, expect } from "vitest";
import { APP_CONFIG, getRiskColorClass } from "@/lib/config";

describe("Scaffold sanity & configuration test", () => {
  it("loads app constants and Tumakuru center correctly", () => {
    expect(APP_CONFIG.name).toBe("DrainGuard");
    expect(APP_CONFIG.simulated).toBe(true);
    expect(APP_CONFIG.defaultCenter.city).toBe("Tumakuru");
    expect(APP_CONFIG.defaultCenter.lat).toBe(13.3392);
    expect(APP_CONFIG.defaultCenter.lng).toBe(77.1140);
  });

  it("resolves risk level colors accurately", () => {
    expect(getRiskColorClass("low")).toBe("text-emerald-500");
    expect(getRiskColorClass("medium")).toBe("text-amber-500");
    expect(getRiskColorClass("high")).toBe("text-orange-500");
    expect(getRiskColorClass("severe")).toBe("text-rose-600");
  });
});
