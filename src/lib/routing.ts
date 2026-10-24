import * as turf from "@turf/turf";
import { Zone, ZoneRisk } from "./types";
import { AntecedentRainfall } from "./weather";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

export interface HazardHotspot {
  zone_id: string;
  zone_name: string;
  risk_score: number;
  risk_level: string;
  reason: string;
  open_reports_count: number;
  basis?: string;
  geographic_justification?: string;
}

export interface RouteEvidenceCheck {
  current_forecast_rain: {
    status: "evaluated";
    rain_mm: number;
    forecast_window: string;
    source: string;
    resolution: string;
  };
  antecedent_and_history: {
    status: "evaluated";
    past_24h_mm: number;
    past_7d_mm: number;
    antecedent_source: string;
    historical_flood_records_status: "unavailable_locally" | "available";
    historical_note: string;
    intersected_choke_points: number;
  };
  traffic_feasibility: {
    status: "baseline_estimates_only" | "live_traffic_connected";
    provider_name: string;
    note: string;
  };
}

export interface ScoredRoute {
  id?: string;
  preference?: "fastest" | "safest" | "balanced";
  geometry: RouteGeometry;
  duration_s: number;
  distance_m: number;
  risk_score: number; // 0..100
  zones_crossed: string[];
  hazard_hotspots?: HazardHotspot[];
  estimated_rain_mm?: number;
  delay_vs_fastest_s?: number;
  explanation?: string;
  evidence_check?: RouteEvidenceCheck;
}

export interface RouteComparisonResult {
  fastest: ScoredRoute;
  safest: ScoredRoute;
  balanced?: ScoredRoute;
  recommendation: "safest" | "fastest" | "balanced";
  reason: string;
  traffic_status: {
    is_live: boolean;
    note: string;
  };
  weather_context: {
    rain_mm: number;
    is_simulated: boolean;
    spatial_scope: string;
  };
  antecedent_context?: AntecedentRainfall;
}

/**
 * Score a single route geometry against current zone risks per docs/05_RISK_ENGINE.md:
 * - Buffer the route line by 30 m (0.03 km).
 * - Sum score of zones it intersects weighted by intersection length.
 * - Normalize to 0..100.
 * - Identify hazard hotspots along the corridor.
 */
export function scoreRoute(
  routeCoords: [number, number][],
  duration_s: number,
  distance_m: number,
  zonesWithRisk: (Zone & { risk: ZoneRisk })[],
  effectiveRainMm: number = 0,
  antecedent?: AntecedentRainfall
): ScoredRoute {
  const emptyEvidence: RouteEvidenceCheck = {
    current_forecast_rain: {
      status: "evaluated",
      rain_mm: effectiveRainMm,
      forecast_window: "Next 3 Hours",
      source: "Open-Meteo REST API",
      resolution: "City-Centroid Regional Grid (~11 km)",
    },
    antecedent_and_history: {
      status: "evaluated",
      past_24h_mm: antecedent?.past_24h_mm || 0,
      past_7d_mm: antecedent?.past_7d_mm || 0,
      antecedent_source: antecedent?.source || "unavailable",
      historical_flood_records_status: "unavailable_locally",
      historical_note: "Authoritative municipal street-level flood hazard maps are unreleased for Tumakuru. Showing topographically ground-truthed lowlands & citizen reports.",
      intersected_choke_points: 0,
    },
    traffic_feasibility: {
      status: "baseline_estimates_only",
      provider_name: "OSRM Public Gateway",
      note: "Live traffic is not connected. Travel times use baseline routing estimates.",
    },
  };

  if (routeCoords.length < 2) {
    return {
      geometry: { type: "LineString", coordinates: routeCoords },
      duration_s: Math.round(duration_s),
      distance_m: Math.round(distance_m),
      risk_score: 0,
      zones_crossed: [],
      hazard_hotspots: [],
      estimated_rain_mm: effectiveRainMm,
      delay_vs_fastest_s: 0,
      explanation: "Direct point coordinates.",
      evidence_check: emptyEvidence,
    };
  }

  const routeLine = turf.lineString(routeCoords);
  const totalLengthKm = turf.length(routeLine, { units: "kilometers" });

  if (totalLengthKm <= 0) {
    return {
      geometry: { type: "LineString", coordinates: routeCoords },
      duration_s: Math.round(duration_s),
      distance_m: Math.round(distance_m),
      risk_score: 0,
      zones_crossed: [],
      hazard_hotspots: [],
      estimated_rain_mm: effectiveRainMm,
      delay_vs_fastest_s: 0,
      explanation: "Zero-length route.",
      evidence_check: emptyEvidence,
    };
  }

  // 30m buffer around route line (0.03 km)
  const routeBuffer = turf.buffer(routeLine, 0.03, { units: "kilometers" });

  const zonesCrossedSet = new Set<string>();
  const hazardHotspots: HazardHotspot[] = [];
  let weightedRiskSum = 0;
  let intersectedLengthKm = 0;

  for (const zone of zonesWithRisk) {
    try {
      let zonePoly: any = null;
      if (zone.geometry.type === "Polygon") {
        zonePoly = turf.polygon(zone.geometry.coordinates);
      } else if (zone.geometry.type === "LineString") {
        zonePoly = turf.buffer(turf.lineString(zone.geometry.coordinates), 0.025, {
          units: "kilometers",
        });
      }

      if (zonePoly && routeBuffer) {
        const intersection = turf.intersect(
          turf.featureCollection([routeBuffer, zonePoly])
        );

        if (intersection) {
          zonesCrossedSet.add(zone.id);

          const lineIntersect = turf.lineSplit(routeLine, zonePoly);
          let segLength = 0;
          if (lineIntersect && lineIntersect.features.length > 0) {
            for (const feat of lineIntersect.features) {
              const midPt = turf.along(feat, turf.length(feat) / 2);
              if (turf.booleanPointInPolygon(midPt, zonePoly)) {
                segLength += turf.length(feat, { units: "kilometers" });
              }
            }
          }

          if (segLength === 0) {
            segLength = Math.min(totalLengthKm, 0.25);
          }

          weightedRiskSum += zone.risk.score * segLength;
          intersectedLengthKm += segLength;

          if (zone.risk.score >= 50 || zone.risk.level === "high" || zone.risk.level === "severe") {
            hazardHotspots.push({
              zone_id: zone.id,
              zone_name: zone.name,
              risk_score: zone.risk.score,
              risk_level: zone.risk.level,
              reason: zone.risk.explanation || `${zone.risk.level.toUpperCase()} waterlogging risk zone`,
              open_reports_count: zone.risk.linked_report_ids?.length || 0,
              basis: zone.basis,
              geographic_justification: zone.geographic_justification,
            });
          }
        }
      }
    } catch {
      // Continue safely
    }
  }

  let routeRiskScore = 0;
  if (totalLengthKm > 0 && intersectedLengthKm > 0) {
    routeRiskScore = Math.min(
      100,
      Math.round(weightedRiskSum / totalLengthKm)
    );
  }

  const evidenceCheck: RouteEvidenceCheck = {
    ...emptyEvidence,
    antecedent_and_history: {
      ...emptyEvidence.antecedent_and_history,
      intersected_choke_points: hazardHotspots.length,
    },
  };

  return {
    geometry: { type: "LineString", coordinates: routeCoords },
    duration_s: Math.round(duration_s),
    distance_m: Math.round(distance_m),
    risk_score: routeRiskScore,
    zones_crossed: Array.from(zonesCrossedSet),
    hazard_hotspots: hazardHotspots,
    estimated_rain_mm: effectiveRainMm,
    delay_vs_fastest_s: 0,
    explanation: "",
    evidence_check: evidenceCheck,
  };
}

/**
 * Fetch routes from OSRM public routing API with alternatives=true and 8s timeout
 */
export async function fetchOSRMAlternatives(
  origin: LatLng,
  destination: LatLng,
  fetchFn: typeof fetch = fetch
): Promise<{ coordinates: [number, number][]; duration: number; distance: number }[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error("No navigable routes found by OSRM.");
    }

    return data.routes.map((r: any) => ({
      coordinates: r.geometry.coordinates as [number, number][],
      duration: r.duration,
      distance: r.distance,
    }));
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Compare fastest vs safest routes per docs/05_RISK_ENGINE.md:
 * - Pick fastest (min duration).
 * - Pick safest (lowest route risk).
 * - Synthesize a balanced option if distinctive alternatives exist.
 * - If safest adds <= 40% duration to fastest: recommend safest.
 * - Otherwise: recommend fastest and explain the time trade-off.
 */
export function compareRoutes(
  scoredRoutes: ScoredRoute[],
  effectiveRainMm: number = 0,
  isSimulated: boolean = false,
  antecedent?: AntecedentRainfall
): RouteComparisonResult {
  if (scoredRoutes.length === 0) {
    throw new Error("No scored routes available for comparison.");
  }

  // Find fastest
  const fastestRaw = [...scoredRoutes].sort((a, b) => a.duration_s - b.duration_s)[0];

  // Find safest (lowest risk)
  const safestRaw = [...scoredRoutes].sort((a, b) => a.risk_score - b.risk_score)[0];

  const durationDelta = safestRaw.duration_s - fastestRaw.duration_s;
  const durationIncreasePct = fastestRaw.duration_s > 0 ? (durationDelta / fastestRaw.duration_s) * 100 : 0;
  const extraMinutes = Math.round(durationDelta / 60);

  const fastest: ScoredRoute = {
    ...fastestRaw,
    id: "route-fastest",
    preference: "fastest",
    delay_vs_fastest_s: 0,
    explanation:
      fastestRaw.risk_score > 60
        ? `Fastest travel time, but passes through high-exposure flood areas (Risk ${fastestRaw.risk_score}/100).`
        : `Direct, optimal driving time with low estimated hazard exposure (Risk ${fastestRaw.risk_score}/100).`,
  };

  const safest: ScoredRoute = {
    ...safestRaw,
    id: "route-safest",
    preference: "safest",
    delay_vs_fastest_s: Math.max(0, durationDelta),
    explanation:
      durationDelta === 0
        ? `Lowest risk path (Score ${safestRaw.risk_score}/100), matching the fastest duration.`
        : `Avoids higher-risk choke points (Risk ${safestRaw.risk_score}/100 vs ${fastestRaw.risk_score}/100), adding ${extraMinutes} min (+${Math.round(durationIncreasePct)}%).`,
  };

  // Build balanced alternative
  let balanced: ScoredRoute | undefined = undefined;
  const nonIdentical = scoredRoutes.filter(
    (r) =>
      (r.duration_s !== fastestRaw.duration_s || r.risk_score !== fastestRaw.risk_score) &&
      (r.duration_s !== safestRaw.duration_s || r.risk_score !== safestRaw.risk_score)
  );

  if (nonIdentical.length > 0) {
    const candidateBalanced = nonIdentical.sort((a, b) => {
      const durA = (a.duration_s - fastestRaw.duration_s) / (fastestRaw.duration_s || 1);
      const durB = (b.duration_s - fastestRaw.duration_s) / (fastestRaw.duration_s || 1);
      return durA * 0.5 + a.risk_score * 0.5 - (durB * 0.5 + b.risk_score * 0.5);
    })[0];

    balanced = {
      ...candidateBalanced,
      id: "route-balanced",
      preference: "balanced",
      delay_vs_fastest_s: Math.max(0, candidateBalanced.duration_s - fastestRaw.duration_s),
      explanation: `Compromise route: balances moderate travel delay with lower waterlogging exposure.`,
    };
  } else if (durationDelta > 0) {
    balanced = {
      ...safest,
      id: "route-balanced",
      preference: "balanced",
      explanation: `Balanced option: recommends avoiding known waterlogging corridors while keeping delays modest.`,
    };
  }

  let recommendation: "safest" | "fastest" | "balanced" = "fastest";
  let reason = "";

  if (fastest.risk_score === safest.risk_score && fastest.duration_s === safest.duration_s) {
    recommendation = "fastest";
    reason = `Primary route has a manageable risk score of ${fastest.risk_score}/100. No significant lower-risk deviation found.`;
  } else if (durationIncreasePct <= 40) {
    recommendation = "safest";
    reason = `Safer detour recommended: avoids severe waterlogging zones (Risk ${safest.risk_score} vs ${fastest.risk_score}) adding only ${extraMinutes} min (+${Math.round(durationIncreasePct)}% travel time).`;
  } else {
    recommendation = "fastest";
    reason = `Fastest route recommended: avoiding flood zones adds ${extraMinutes} min (+${Math.round(durationIncreasePct)}% travel time), exceeding the 40% threshold. Proceed with caution.`;
  }

  return {
    fastest,
    safest,
    balanced,
    recommendation,
    reason,
    traffic_status: {
      is_live: false,
      note: "Live vehicular traffic data is unavailable. Travel times use OSRM baseline driving speeds without live congestion.",
    },
    weather_context: {
      rain_mm: effectiveRainMm,
      is_simulated: isSimulated,
      spatial_scope: "City-Centroid Forecast (~11km Open-Meteo grid; applies uniformly across municipal ward corridors)",
    },
    antecedent_context: antecedent,
  };
}
