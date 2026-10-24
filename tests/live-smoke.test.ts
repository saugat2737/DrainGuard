import { describe, it, expect } from "vitest";

describe("Opt-in Live Upstream Service Smoke Suite", () => {
  const isSmokeOptIn = process.env.RUN_LIVE_SMOKE === "true";

  it.runIf(isSmokeOptIn)(
    "Live Network: reaches Open-Meteo REST API and returns valid precipitation schema within 5s",
    async () => {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=13.3392&longitude=77.1140&hourly=precipitation&forecast_days=1&timezone=auto";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        expect(res.ok).toBe(true);
        const data = await res.json();
        expect(data.hourly).toBeDefined();
        expect(Array.isArray(data.hourly.precipitation)).toBe(true);
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    }
  );

  it.runIf(isSmokeOptIn)(
    "Live Network: reaches OSRM public gateway and returns driving route within 5s",
    async () => {
      // Tumakuru Railway Station -> Siddaganga Extension
      const url =
        "https://router.project-osrm.org/route/v1/driving/77.1215,13.3465;77.1080,13.3290?overview=false";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        expect(res.ok).toBe(true);
        const data = await res.json();
        expect(data.code).toBe("Ok");
        expect(data.routes.length).toBeGreaterThan(0);
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    }
  );

  it.runIf(!isSmokeOptIn)(
    "Live smoke suite is dormant by default to ensure deterministic CI runs (set RUN_LIVE_SMOKE=true to execute)",
    () => {
      expect(isSmokeOptIn).toBe(false);
    }
  );
});
