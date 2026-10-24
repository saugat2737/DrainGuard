/**
 * Traffic Adapter for DrainGuard Navigation
 *
 * Requirements & Evaluation:
 * - Live traffic requires a commercial or specialized provider (e.g., TomTom, HERE, Google Routes, or Mapbox Traffic).
 * - OSRM public service (router.project-osrm.org) provides geometric route solutions and static speed profiles, NOT live congestion or dynamic road incident telemetry.
 * - To remain honest and avoid fabricating fake live congestion, this adapter clearly exposes provider availability, capabilities, and setup instructions.
 */

export interface TrafficStatus {
  provider: "none" | "tomtom" | "here" | "google";
  isLiveTrafficAvailable: boolean;
  message: string;
  setupInstructions?: string;
}

export function getTrafficProviderStatus(): TrafficStatus {
  const tomtomKey = process.env.TOMTOM_API_KEY;
  const hereKey = process.env.HERE_API_KEY;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  if (tomtomKey) {
    return {
      provider: "tomtom",
      isLiveTrafficAvailable: true,
      message: "TomTom Flow & Incident API configured.",
    };
  }

  if (hereKey) {
    return {
      provider: "here",
      isLiveTrafficAvailable: true,
      message: "HERE Routing & Traffic v8 configured.",
    };
  }

  if (googleKey) {
    return {
      provider: "google",
      isLiveTrafficAvailable: true,
      message: "Google Routes Traffic Layer configured.",
    };
  }

  return {
    provider: "none",
    isLiveTrafficAvailable: false,
    message: "Live vehicular traffic data is unavailable. Travel times use OSRM baseline driving speeds without live congestion.",
    setupInstructions:
      "To enable live traffic overlays, configure TOMTOM_API_KEY, HERE_API_KEY, or GOOGLE_MAPS_API_KEY in your server environment variables.",
  };
}
