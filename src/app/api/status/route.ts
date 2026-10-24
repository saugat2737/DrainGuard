import { NextResponse } from "next/server";
import { getWeatherForecast, getMapCoordinates } from "@/lib/weather";
import { getTrafficProviderStatus } from "@/lib/traffic";
import { getAllReports } from "@/lib/reports-store";
import zonesData from "@/data/zones.seed.json";
import {
  getAuditCache,
  ServiceStatusItem,
  SystemStatusReport,
} from "@/lib/service-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const audit = getAuditCache();
  const coords = getMapCoordinates();
  const traffic = getTrafficProviderStatus();
  const allReports = getAllReports();
  const totalReports = allReports.length;
  const citizenCount = allReports.filter((r) => r.source === "citizen").length;
  const seedCount = allReports.filter((r) => r.source === "seed").length;
  const zonesCount = zonesData.zones.length;

  // 1. Weather service status
  let weatherItem: ServiceStatusItem;
  try {
    const weather = await getWeatherForecast();
    const isLive = weather.source === "open-meteo";
    weatherItem = {
      service: "weather",
      name: "Open-Meteo Precipitation Forecast",
      status: isLive ? "available" : "cached",
      mode: isLive ? "live_rest" : "cache_fallback",
      data_source: "Open-Meteo WMO NWP Grid (Free, No Key Required)",
      last_success_at: isLive ? weather.last_updated || new Date().toISOString() : audit.weather.last_success_at,
      last_checked_at: new Date().toISOString(),
      message: isLive
        ? "Active forecast received. Note: Models provide regional precipitation, not direct street ponding depth."
        : "Using cached meteorological forecast.",
      coverage_or_scope: "Tumakuru Municipal Area (11 km grid resolution)",
      requires_credentials: false,
    };
  } catch {
    weatherItem = {
      service: "weather",
      name: "Open-Meteo Precipitation Forecast",
      status: "degraded",
      mode: "cache_fallback",
      data_source: "Internal Cache",
      last_success_at: audit.weather.last_success_at,
      last_checked_at: new Date().toISOString(),
      message: "Weather server temporarily unreachable; fallback forecast displayed.",
      coverage_or_scope: "Tumakuru Municipal Area",
      requires_credentials: false,
    };
  }

  // 2. Routing engine status (OSRM)
  const routingItem: ServiceStatusItem = {
    service: "routing",
    name: "OSRM Driving Router (OpenStreetMap)",
    status: audit.routing.status,
    mode: "public_osm_api",
    data_source: "Project-OSRM Public Gateway (router.project-osrm.org)",
    last_success_at: audit.routing.last_success_at,
    last_checked_at: audit.routing.last_checked_at,
    message:
      audit.routing.status === "available"
        ? "Navigable geometric driving routing active. Recommends lowest-risk detours whenever available."
        : "OSRM routing service degraded or using local baseline.",
    coverage_or_scope: "Tumakuru Road Network (OSM Car profile)",
    requires_credentials: false,
  };

  // 3. Traffic provider status
  const trafficItem: ServiceStatusItem = {
    service: "traffic",
    name: "Live Vehicular Congestion Telemetry",
    status: traffic.isLiveTrafficAvailable ? "available" : "unavailable",
    mode: traffic.provider !== "none" ? `${traffic.provider}_live` : "unconnected",
    data_source: traffic.provider !== "none" ? `${traffic.provider.toUpperCase()} Traffic Flow API` : "None (OSRM static speeds only)",
    last_success_at: traffic.isLiveTrafficAvailable ? new Date().toISOString() : null,
    last_checked_at: new Date().toISOString(),
    message: traffic.message,
    coverage_or_scope: traffic.isLiveTrafficAvailable ? "Live urban traffic flow" : "Not connected",
    requires_credentials: true,
  };

  // 4. Vision AI Blockage Classifier
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");
  const visionItem: ServiceStatusItem = {
    service: "vision_ai",
    name: "Drain Blockage Vision Classifier",
    status: hasGemini ? "available" : "demo",
    mode: hasGemini ? "gemini_multimodal" : "deterministic_fallback",
    data_source: hasGemini ? "Google Gemini 1.5 Flash Vision REST API" : "Rule-based heuristic fallback (Zero-downtime)",
    last_success_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    message: hasGemini
      ? "AI visual waste & severity classifier active."
      : "Operating in zero-downtime demonstration mode. Categorizes images with deterministic classification.",
    coverage_or_scope: "Citizen-uploaded drain photographs (JPEG, PNG, WebP ≤ 5MB)",
    requires_credentials: true,
  };

  // 5. Hydrological Risk Engine
  const riskEngineItem: ServiceStatusItem = {
    service: "risk_engine",
    name: "Deterministic Hydro Risk Engine (docs/05)",
    status: "local",
    mode: "pure_typescript",
    data_source: "In-memory pure function (40% rain, 25% blockage, 20% history, 15% elevation)",
    last_success_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    message: "Pure mathematical algorithm running locally without network dependencies or black-box ML.",
    coverage_or_scope: `${zonesCount} monitored municipal catchments in Tumakuru`,
    requires_credentials: false,
  };

  // 6. Reports & Municipal Store
  const reportsStoreItem: ServiceStatusItem = {
    service: "reports_store",
    name: "Civic Reports & Municipal Dispatch Store",
    status: "local",
    mode: "in_memory_synchronized",
    data_source: `Runtime In-Memory Store (${citizenCount} citizen, ${seedCount} verified seed fixtures)`,
    last_success_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    message: `In-memory synchronized store with ${totalReports} total reports. Changes persist during current server session.`,
    coverage_or_scope: "Ward-level citizen reports within 200m buffer of drainage zones",
    requires_credentials: false,
  };

  const services: ServiceStatusItem[] = [
    weatherItem,
    routingItem,
    trafficItem,
    visionItem,
    riskEngineItem,
    reportsStoreItem,
  ];

  const hasDegraded = services.some((s) => s.status === "degraded");
  const overallStatus = hasDegraded ? "degraded" : "healthy";

  const report: SystemStatusReport = {
    timestamp: new Date().toISOString(),
    overall_status: overallStatus,
    services,
    environment: {
      city: "Tumakuru, Karnataka, India",
      coordinates: coords,
      storage_type: "in_memory",
      is_production: process.env.NODE_ENV === "production",
    },
  };

  return NextResponse.json({ data: report });
}
