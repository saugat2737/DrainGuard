/**
 * Service Status & Telemetry Registry
 * Provides trustworthy, non-leaking diagnostic state for all upstream and local integrations.
 */

export type ServiceHealth = "available" | "degraded" | "unavailable" | "cached" | "demo" | "local";

export interface ServiceStatusItem {
  service: string;
  name: string;
  status: ServiceHealth;
  mode: string;
  data_source: string;
  last_success_at: string | null;
  last_checked_at: string;
  message: string;
  coverage_or_scope?: string;
  requires_credentials?: boolean;
}

export interface SystemStatusReport {
  timestamp: string;
  overall_status: "healthy" | "degraded" | "action_required";
  services: ServiceStatusItem[];
  environment: {
    city: string;
    coordinates: { lat: number; lng: number };
    storage_type: "in_memory" | "database";
    is_production: boolean;
  };
}

// In-memory status audit cache (reused without firing excessive upstream requests on every render)
interface StatusAuditCache {
  weather: {
    last_success_at: string | null;
    last_checked_at: string;
    status: ServiceHealth;
    message: string;
  };
  routing: {
    last_success_at: string | null;
    last_checked_at: string;
    status: ServiceHealth;
    message: string;
  };
  vision: {
    last_checked_at: string;
    status: ServiceHealth;
    message: string;
  };
}

const auditCache: StatusAuditCache = {
  weather: {
    last_success_at: null,
    last_checked_at: new Date().toISOString(),
    status: "available",
    message: "Open-Meteo REST service reachable.",
  },
  routing: {
    last_success_at: null,
    last_checked_at: new Date().toISOString(),
    status: "available",
    message: "OSRM OpenStreetMap routing engine active.",
  },
  vision: {
    last_checked_at: new Date().toISOString(),
    status: process.env.GEMINI_API_KEY ? "available" : "demo",
    message: process.env.GEMINI_API_KEY
      ? "Google Gemini 1.5 Flash Vision configured."
      : "Deterministic offline vision classifier active (GEMINI_API_KEY unconfigured).",
  },
};

export function recordWeatherSuccess(timestamp: string = new Date().toISOString()) {
  auditCache.weather.last_success_at = timestamp;
  auditCache.weather.last_checked_at = timestamp;
  auditCache.weather.status = "available";
  auditCache.weather.message = "Open-Meteo REST forecast synced successfully.";
}

export function recordWeatherCacheFallback(timestamp: string = new Date().toISOString()) {
  auditCache.weather.last_checked_at = timestamp;
  auditCache.weather.status = "cached";
  auditCache.weather.message = "Upstream request used local meteorological cache.";
}

export function recordRoutingSuccess(timestamp: string = new Date().toISOString()) {
  auditCache.routing.last_success_at = timestamp;
  auditCache.routing.last_checked_at = timestamp;
  auditCache.routing.status = "available";
  auditCache.routing.message = "OSRM public routing candidate evaluation succeeded.";
}

export function recordRoutingFailure(errorMsg: string, timestamp: string = new Date().toISOString()) {
  auditCache.routing.last_checked_at = timestamp;
  auditCache.routing.status = "degraded";
  auditCache.routing.message = `OSRM public router encountered transient issue: ${errorMsg}`;
}

export function getAuditCache() {
  return auditCache;
}
