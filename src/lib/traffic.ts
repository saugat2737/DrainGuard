/**
 * Traffic Adapter for DrainGuard Navigation
 *
 * CRITICAL CONSTRAINT COMPLIANCE — ZERO-COST & FREE SUSTAINABLE TECHNOLOGY ONLY:
 * - DrainGuard strictly prohibits commercial paid APIs (Google Maps Platform, TomTom paid traffic, HERE paid traffic, paid Mapbox tiers).
 * - Live vehicular congestion data in Tumakuru requires a paid telemetry subscription which is prohibited under DrainGuard's free-forever architecture.
 * - This adapter enforces honest disclosure: live congestion is marked unavailable, baseline OSRM road network estimates are used, and no fake congestion colors or synthetic delays are fabricated.
 */

export interface TrafficStatus {
  provider: "none" | "open_data";
  isLiveTrafficAvailable: boolean;
  message: string;
  setupInstructions?: string;
}

export function getTrafficProviderStatus(): TrafficStatus {
  return {
    provider: "none",
    isLiveTrafficAvailable: false,
    message: "Live vehicular traffic data is unavailable. Travel times use OSRM baseline driving speeds without live congestion.",
    setupInstructions:
      "Per DrainGuard's zero-cost open data policy, paid traffic API keys are prohibited. The application operates honestly on OpenStreetMap baseline routing.",
  };
}
