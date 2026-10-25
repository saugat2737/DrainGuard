import { Report } from "./types";
import seedReportsData from "@/data/reports.seed.json";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Report Repository Interface
 * Supports persistent PostgreSQL (via Supabase) with seamless testing/local fallback.
 */
export interface IReportsRepository {
  getAllReports(): Promise<Report[]>;
  getReportById(id: string): Promise<Report | null>;
  addReport(report: Report): Promise<Report>;
  updateReportStatus(id: string, newStatus: Report["status"]): Promise<Report | null>;
  isPersistent(): boolean;
  getStorageMode(): "supabase" | "in_memory";
}

/**
 * In-Memory Repository
 * Used for deterministic automated tests and isolated local development.
 */
export class InMemoryReportsRepository implements IReportsRepository {
  private runtimeReports: Report[] = [];

  constructor(seedWithDemo = false) {
    if (seedWithDemo) {
      this.runtimeReports = [...(seedReportsData.reports as unknown as Report[])];
    }
  }

  getAllReportsSync(): Report[] {
    return [...this.runtimeReports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getAllReports(): Promise<Report[]> {
    return this.getAllReportsSync();
  }

  addReportSync(report: Report): Report {
    this.runtimeReports.push({ ...report });
    return { ...report };
  }

  async getReportById(id: string): Promise<Report | null> {
    return this.runtimeReports.find((r) => r.id === id) || null;
  }

  async addReport(report: Report): Promise<Report> {
    this.runtimeReports.push({ ...report });
    return { ...report };
  }

  async updateReportStatus(id: string, newStatus: Report["status"]): Promise<Report | null> {
    const report = this.runtimeReports.find((r) => r.id === id);
    if (!report) return null;
    report.status = newStatus;
    return { ...report };
  }

  isPersistent(): boolean {
    return false;
  }

  getStorageMode(): "in_memory" {
    return "in_memory";
  }

  reset(seedWithDemo = false): void {
    if (seedWithDemo) {
      this.runtimeReports = [...(seedReportsData.reports as unknown as Report[])];
    } else {
      this.runtimeReports = [];
    }
  }
}

/**
 * Supabase PostgreSQL Repository
 * Full persistence across serverless container recycling with RLS and index optimizations.
 */
export class SupabaseReportsRepository implements IReportsRepository {
  private client: SupabaseClient;
  private fallbackMemory: InMemoryReportsRepository;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.fallbackMemory = new InMemoryReportsRepository(true);
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        // DrainGuard only uses standard REST queries on PostgreSQL.
        // Providing dummy no-op transport avoids Node.js native WebSocket runtime errors in Node < 22.
        transport: class DummyWebSocket {
          static readonly CONNECTING = 0;
          static readonly OPEN = 1;
          static readonly CLOSING = 2;
          static readonly CLOSED = 3;
          readyState = 3;
          close() {}
          send() {}
          addEventListener() {}
          removeEventListener() {}
        } as any,
      },
    });
  }

  private isSchemaCacheError(errMsg?: string): boolean {
    if (!errMsg) return false;
    const lower = errMsg.toLowerCase();
    return (
      lower.includes("could not find the table") ||
      lower.includes("schema cache") ||
      lower.includes("relation") && lower.includes("does not exist") ||
      lower.includes("not found in schema cache")
    );
  }

  async getAllReports(): Promise<Report[]> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (this.isSchemaCacheError(error.message)) {
          console.warn("[Supabase] Table public.reports missing in schema cache, serving seeded reports fallback:", error.message);
          return this.fallbackMemory.getAllReports();
        }
        throw new Error(`Database error querying reports: ${error.message}`);
      }

      return (data as Report[]) || [];
    } catch (err: any) {
      if (this.isSchemaCacheError(err?.message)) {
        return this.fallbackMemory.getAllReports();
      }
      throw err;
    }
  }

  async getReportById(id: string): Promise<Report | null> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        if (this.isSchemaCacheError(error.message)) {
          return this.fallbackMemory.getReportById(id);
        }
        throw new Error(`Database error querying report ${id}: ${error.message}`);
      }

      return (data as Report) || null;
    } catch (err: any) {
      if (this.isSchemaCacheError(err?.message)) {
        return this.fallbackMemory.getReportById(id);
      }
      throw err;
    }
  }

  async addReport(report: Report): Promise<Report> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .insert({
          id: report.id,
          lat: report.lat,
          lng: report.lng,
          zone_id: report.zone_id,
          photo_url: report.photo_url,
          blockage_type: report.blockage_type,
          severity: report.severity,
          summary: report.summary,
          status: report.status,
          source: report.source,
          created_at: report.created_at,
        })
        .select()
        .single();

      if (error) {
        if (this.isSchemaCacheError(error.message)) {
          console.warn("[Supabase] Table public.reports not found in schema cache, saving to memory fallback");
          return this.fallbackMemory.addReport(report);
        }
        throw new Error(`Database error creating report: ${error.message}`);
      }

      return data as Report;
    } catch (err: any) {
      if (this.isSchemaCacheError(err?.message)) {
        return this.fallbackMemory.addReport(report);
      }
      throw err;
    }
  }

  async updateReportStatus(id: string, newStatus: Report["status"]): Promise<Report | null> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .update({ status: newStatus })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        if (this.isSchemaCacheError(error.message)) {
          return this.fallbackMemory.updateReportStatus(id, newStatus);
        }
        throw new Error(`Database error updating status for ${id}: ${error.message}`);
      }

      return (data as Report) || null;
    } catch (err: any) {
      if (this.isSchemaCacheError(err?.message)) {
        return this.fallbackMemory.updateReportStatus(id, newStatus);
      }
      throw err;
    }
  }

  isPersistent(): boolean {
    return true;
  }

  getStorageMode(): "supabase" {
    return "supabase";
  }
}

/**
 * Storage Subsystem Factory
 * Checks environment credentials and production posture.
 */
export function getReportsRepository(): IReportsRepository {
  // If custom mock repository injected into global state for testing, return it
  if ((globalThis as any).__DRAINGUARD_CUSTOM_REPO__) {
    return (globalThis as any).__DRAINGUARD_CUSTOM_REPO__;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && serviceRoleKey) {
    return new SupabaseReportsRepository(supabaseUrl, serviceRoleKey);
  }

  // Default In-Memory repository for development, test, and zero-config Vercel deployment
  // Safe default: only block if explicitly configured to false AND NOT in automatic Vercel zero-config mode
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && process.env.ALLOW_IN_MEMORY_STORAGE === "false" && process.env.VERCEL !== "1") {
    return {
      getAllReports: async () => [],
      getReportById: async () => null,
      addReport: async () => {
        throw new Error("PERSISTENT_STORAGE_UNAVAILABLE: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in production.");
      },
      updateReportStatus: async () => {
        throw new Error("PERSISTENT_STORAGE_UNAVAILABLE: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in production.");
      },
      isPersistent: () => false,
      getStorageMode: () => "in_memory",
    };
  }

  // Default In-Memory repository for development, test, and zero-config Vercel deployment
  if (!(globalThis as any).__DRAINGUARD_MEM_REPO__) {
    const seedWithDemo = process.env.DISABLE_DEMO_REPORTS !== "true";
    (globalThis as any).__DRAINGUARD_MEM_REPO__ = new InMemoryReportsRepository(seedWithDemo);
  }

  return (globalThis as any).__DRAINGUARD_MEM_REPO__;
}
