import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppCache, CachePolicy } from "../src/lib/cache/app-cache";
import {
  photonSearchCache,
  weatherCache,
  osrmRouteCache,
  resetAllCaches,
} from "../src/lib/cache/instances";
import { getAllReports, resetReportsStore, addReport, loadSeedReports } from "../src/lib/reports-store";

describe("Production Hardening & Centralized Caching Architecture", () => {
  beforeEach(() => {
    resetAllCaches();
    vi.restoreAllMocks();
  });

  describe("1. Bounded AppCache & LRU Eviction", () => {
    it("evicts oldest least-recently-used entry when exceeding maxSize", () => {
      const policy: CachePolicy = {
        defaultTtlMs: 60000,
        staleGraceMs: 60000,
        maxSize: 3,
      };
      const cache = new AppCache<string>(policy);

      cache.set("k1", "val1", "test");
      cache.set("k2", "val2", "test");
      cache.set("k3", "val3", "test");
      expect(cache.size()).toBe(3);

      // Access k1 to make k2 the oldest
      cache.get("k1");

      // Insert k4, should evict k2
      cache.set("k4", "val4", "test");
      expect(cache.size()).toBe(3);
      expect(cache.get("k2")).toBeNull();
      expect(cache.get("k1")?.value).toBe("val1");
      expect(cache.get("k4")?.value).toBe("val4");

      const metrics = cache.getMetrics();
      expect(metrics.evictions).toBe(1);
      expect(metrics.hits).toBe(3);
    });

    it("respects TTL expiration and stale-if-error grace window", async () => {
      const policy: CachePolicy = {
        defaultTtlMs: 50, // 50ms TTL
        staleGraceMs: 100, // 100ms stale grace
        maxSize: 10,
      };
      const cache = new AppCache<number>(policy);

      cache.set("key_temp", 42, "provider_a");
      expect(cache.get("key_temp")?.isStale).toBe(false);

      // Wait 70ms -> past TTL, but within stale grace
      await new Promise((r) => setTimeout(r, 70));
      const staleEntry = cache.get("key_temp");
      expect(staleEntry?.isStale).toBe(true);
      expect(staleEntry?.value).toBe(42);

      // Loader fallback on error serves stale value
      const result = await cache.getOrLoad(
        "key_temp",
        async () => {
          throw new Error("Upstream network failure");
        },
        true
      );

      expect(result.data).toBe(42);
      expect(result.isStale).toBe(true);
    });
  });

  describe("2. Request Deduplication & In-Flight Coalescing", () => {
    it("coalesces concurrent identical upstream requests into a single network call", async () => {
      const policy: CachePolicy = {
        defaultTtlMs: 60000,
        staleGraceMs: 60000,
        maxSize: 10,
      };
      const cache = new AppCache<string>(policy);

      let loaderCalls = 0;
      const slowLoader = async () => {
        loaderCalls++;
        await new Promise((r) => setTimeout(r, 40));
        return { value: "resolved_data", source: "upstream_api" };
      };

      // Dispatch 3 concurrent requests simultaneously for the exact same key
      const [res1, res2, res3] = await Promise.all([
        cache.getOrLoad("same_key", slowLoader),
        cache.getOrLoad("same_key", slowLoader),
        cache.getOrLoad("same_key", slowLoader),
      ]);

      expect(res1.data).toBe("resolved_data");
      expect(res2.data).toBe("resolved_data");
      expect(res3.data).toBe("resolved_data");

      // Strictly single loader call (prevented Thundering Herd)
      expect(loaderCalls).toBe(1);
      const metrics = cache.getMetrics();
      expect(metrics.inFlightDeduplications).toBe(2);
    });
  });

  describe("3. Production Data Policy (Zero Fake Data & Seed Isolation)", () => {
    it("ensures reports store initializes clean without synthetic demo records by default in production", () => {
      resetReportsStore(false);
      const reports = getAllReports();
      // By default in production/clean state: 0 fake reports
      expect(reports.length).toBe(0);

      // Explicitly adding a real citizen report
      addReport({
        id: "rep-live-01",
        lat: 13.342,
        lng: 77.112,
        zone_id: "Z01",
        photo_url: null,
        blockage_type: "debris",
        severity: 2,
        summary: "Live citizen drain blockage report",
        status: "open",
        source: "citizen",
        created_at: new Date().toISOString(),
      });

      const updated = getAllReports();
      expect(updated.length).toBe(1);
      expect(updated[0].source).toBe("citizen");
    });

    it("allows explicit opt-in loading of seed reports exclusively for test fixture runs", () => {
      loadSeedReports();
      const seedReports = getAllReports();
      expect(seedReports.length).toBeGreaterThan(0);
      expect(seedReports.every((r) => r.source === "seed")).toBe(true);
    });
  });
});
