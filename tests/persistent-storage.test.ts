import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  InMemoryReportsRepository,
  SupabaseReportsRepository,
  getReportsRepository,
} from "@/lib/reports-repository";
import { Report } from "@/lib/types";

describe("Persistent Reports Repository & Production Storage Architecture", () => {
  beforeEach(() => {
    delete (globalThis as any).__DRAINGUARD_CUSTOM_REPO__;
    delete (globalThis as any).__DRAINGUARD_MEM_REPO__;
  });

  it("1. adds and retrieves reports from InMemoryReportsRepository", async () => {
    const repo = new InMemoryReportsRepository(false);
    const mockReport: Report = {
      id: "rep-test-1",
      lat: 13.34,
      lng: 77.11,
      zone_id: "Z01",
      photo_url: null,
      blockage_type: "plastic",
      severity: 2,
      summary: "Blocked stormwater drain with plastic bottles",
      status: "open",
      source: "citizen",
      created_at: new Date().toISOString(),
    };

    const saved = await repo.addReport(mockReport);
    expect(saved.id).toBe("rep-test-1");

    const found = await repo.getReportById("rep-test-1");
    expect(found).not.toBeNull();
    expect(found?.blockage_type).toBe("plastic");

    const all = await repo.getAllReports();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe("rep-test-1");
  });

  it("2. updates report status correctly", async () => {
    const repo = new InMemoryReportsRepository(false);
    const mockReport: Report = {
      id: "rep-status-1",
      lat: 13.34,
      lng: 77.11,
      zone_id: "Z01",
      photo_url: null,
      blockage_type: "debris",
      severity: 3,
      summary: "Tree branch choking culvert inlet",
      status: "open",
      source: "citizen",
      created_at: new Date().toISOString(),
    };

    await repo.addReport(mockReport);
    const updated = await repo.updateReportStatus("rep-status-1", "assigned");
    expect(updated?.status).toBe("assigned");

    const retrieved = await repo.getReportById("rep-status-1");
    expect(retrieved?.status).toBe("assigned");

    const cleared = await repo.updateReportStatus("rep-status-1", "cleared");
    expect(cleared?.status).toBe("cleared");

    const nonExistent = await repo.updateReportStatus("rep-none", "cleared");
    expect(nonExistent).toBeNull();
  });

  it("3. isolates seed fixtures when clean state requested", async () => {
    const repoClean = new InMemoryReportsRepository(false);
    const cleanList = await repoClean.getAllReports();
    expect(cleanList.length).toBe(0);

    const repoSeeded = new InMemoryReportsRepository(true);
    const seededList = await repoSeeded.getAllReports();
    expect(seededList.length).toBeGreaterThan(0);
  });

  it("4. rejects mutations in production mode when persistent database is unconfigured", async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevAllow = process.env.ALLOW_IN_MEMORY_STORAGE;
    const prevUrl = process.env.SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.ALLOW_IN_MEMORY_STORAGE;

      const repo = getReportsRepository();
      expect(repo.isPersistent()).toBe(false);

      await expect(
        repo.addReport({
          id: "rep-prod-fail",
          lat: 13.34,
          lng: 77.11,
          zone_id: "Z01",
          photo_url: null,
          blockage_type: "silt",
          severity: 2,
          summary: "Heavy silt deposit",
          status: "open",
          source: "citizen",
          created_at: new Date().toISOString(),
        })
      ).rejects.toThrow(/PERSISTENT_STORAGE_UNAVAILABLE/);
    } finally {
      (process.env as any).NODE_ENV = prevEnv;
      if (prevAllow) process.env.ALLOW_IN_MEMORY_STORAGE = prevAllow;
      if (prevUrl) process.env.SUPABASE_URL = prevUrl;
      if (prevKey) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    }
  });

  it("5. instantiates SupabaseReportsRepository when credentials provided", () => {
    const prevUrl = process.env.SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const repo = getReportsRepository();
      expect(repo.isPersistent()).toBe(true);
      expect(repo.getStorageMode()).toBe("supabase");
    } finally {
      if (prevUrl) process.env.SUPABASE_URL = prevUrl;
      else delete process.env.SUPABASE_URL;
      if (prevKey) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });
});
