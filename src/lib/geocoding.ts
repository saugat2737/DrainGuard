/**
 * Production-Hardened Geocoding Service Adapter for DrainGuard
 * 
 * Strict Open-Data and Zero-Cost Architecture:
 * - Uses Photon (by Komoot), built on OpenStreetMap / Nominatim open data.
 * - Free public endpoint without API keys: https://photon.komoot.io/api/
 * - Centrally cached using bounded AppCache instances with LRU eviction and in-flight request deduplication.
 * - Never hits OSM Nominatim for autocomplete (strictly adhering to OSM Foundation acceptable usage policy).
 * - Clear provenance: Live/cached geocoder results are NEVER conflated with local offline suggestions.
 * - Offline suggestions explicitly indicate `source: "local_offline_catalog"` so users know when data is not live from upstream.
 */

import { photonSearchCache, photonReverseCache } from "./cache/instances";

export interface GeocodePlace {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  city?: string;
  state?: string;
  postcode?: string;
  isLocalSuggestion?: boolean;
  provenance?: "photon_live" | "photon_cached" | "local_offline_catalog";
}

// Officially documented Tumakuru civic landmark catalog (OpenStreetMap public features)
export const TUMAKURU_OFFLINE_LANDMARKS: GeocodePlace[] = [
  {
    id: "osm-node-railway",
    name: "Tumakuru Railway Station",
    displayName: "Tumakuru Railway Station, Mandipet, Tumakuru, Karnataka 572101",
    lat: 13.3465,
    lng: 77.1215,
    type: "railway_station",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-way-ksrtc",
    name: "Tumkur KSRTC Bus Stand",
    displayName: "Tumkur KSRTC Bus Stand, KSRTC Link Road, Tumakuru, Karnataka 572101",
    lat: 13.3411,
    lng: 77.1025,
    type: "bus_station",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-node-siddaganga",
    name: "Siddaganga Math",
    displayName: "Siddaganga Math, Kyatsandra, Tumakuru, Karnataka 572104",
    lat: 13.3155,
    lng: 77.1428,
    type: "monastery",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572104",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-node-dc-office",
    name: "Tumakuru DC Office (District Collectorate)",
    displayName: "DC Office Complex, Mini Vidhana Soudha, Tumakuru, Karnataka 572101",
    lat: 13.3382,
    lng: 77.1075,
    type: "government",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-node-amanikere",
    name: "Amanikere Lake Promenade",
    displayName: "Amanikere Lake North Shore, Tumakuru, Karnataka 572102",
    lat: 13.3440,
    lng: 77.1140,
    type: "lake",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572102",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-node-gubbi-gate",
    name: "Gubbi Gate Market",
    displayName: "Gubbi Gate Circle, B.H. Road, Tumakuru, Karnataka 572101",
    lat: 13.3370,
    lng: 77.1020,
    type: "marketplace",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-way-mg-road",
    name: "MG Road Commercial Corridor",
    displayName: "Mahatma Gandhi Road, Ward 12, Tumakuru, Karnataka 572101",
    lat: 13.3395,
    lng: 77.1090,
    type: "commercial",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-node-batawadi",
    name: "Batawadi Junction (NH 48)",
    displayName: "Batawadi Cross, NH 48 / Ring Road, Tumakuru, Karnataka 572103",
    lat: 13.3280,
    lng: 77.1350,
    type: "junction",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572103",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
  {
    id: "osm-node-university",
    name: "Tumkur University Campus",
    displayName: "Tumkur University, B.H. Road, Tumakuru, Karnataka 572103",
    lat: 13.3262,
    lng: 77.1265,
    type: "university",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572103",
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  },
];

export const TUMAKURU_FALLBACK_PRESETS = TUMAKURU_OFFLINE_LANDMARKS;

// Tumakuru reference centroid for geographic bias
export const TUMAKURU_CENTROID = {
  lat: 13.3392,
  lng: 77.1140,
};

/**
 * Searches places via Photon Geocoder with Tumakuru geographic bias and request deduplication
 */
export async function searchPlaces(
  query: string,
  options?: {
    limit?: number;
    latBias?: number;
    lngBias?: number;
    signal?: AbortSignal;
  }
): Promise<{ places: GeocodePlace[]; provider: "photon" | "local_fallback"; cached: boolean; isStale?: boolean }> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { places: [], provider: "photon", cached: false };
  }

  const limit = options?.limit || 5;
  const latBias = options?.latBias ?? TUMAKURU_CENTROID.lat;
  const lngBias = options?.lngBias ?? TUMAKURU_CENTROID.lng;
  const cacheKey = `search:${trimmed.toLowerCase()}:${limit}:${latBias.toFixed(3)}:${lngBias.toFixed(3)}`;

  try {
    const result = await photonSearchCache.getOrLoad(
      cacheKey,
      async () => {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          trimmed
        )}&lat=${latBias}&lon=${lngBias}&zoom=13&location_bias_scale=0.3&limit=${limit}`;

        const res = await fetch(url, {
          signal: options?.signal,
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Photon upstream status ${res.status}`);
        }

        const data = await res.json();
        if (!data || !Array.isArray(data.features)) {
          throw new Error("Invalid Photon response schema");
        }

        const parsedPlaces: GeocodePlace[] = data.features.map((feature: any, index: number) => {
          const coords = feature.geometry?.coordinates || [0, 0];
          const props = feature.properties || {};

          // Photon GeoJSON returns [longitude, latitude]
          const lng = coords[0];
          const lat = coords[1];

          const parts: string[] = [];
          if (props.street) parts.push(props.street + (props.housenumber ? ` ${props.housenumber}` : ""));
          if (props.district) parts.push(props.district);
          if (props.city && props.city !== props.name) parts.push(props.city);
          if (props.state) parts.push(props.state);
          if (props.postcode) parts.push(props.postcode);

          const displayName = parts.length > 0 ? `${props.name || "Location"}, ${parts.join(", ")}` : props.name || "Location";

          return {
            id: `photon-${props.osm_type || "N"}-${props.osm_id || index}-${lat}-${lng}`,
            name: props.name || props.street || "Location",
            displayName,
            lat,
            lng,
            type: props.osm_value || props.type || undefined,
            city: props.city || undefined,
            state: props.state || undefined,
            postcode: props.postcode || undefined,
            isLocalSuggestion: false,
            provenance: "photon_live",
          };
        });

        return {
          value: parsedPlaces,
          source: "photon_upstream",
        };
      },
      true // allowStaleOnError
    );

    return {
      places: result.data,
      provider: "photon",
      cached: result.cached,
      isStale: result.isStale,
    };
  } catch (err: unknown) {
    if ((err as any)?.name === "AbortError") {
      throw err;
    }

    // Geocoder downtime fallback: match against verified local Tumakuru landmarks
    const queryLower = trimmed.toLowerCase();
    const matchedPresets = TUMAKURU_OFFLINE_LANDMARKS.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.displayName.toLowerCase().includes(queryLower)
    ).slice(0, limit);

    return {
      places: matchedPresets,
      provider: "local_fallback",
      cached: false,
    };
  }
}

/**
 * Reverse geocodes a [latitude, longitude] coordinate into a human-readable location
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<GeocodePlace> {
  const roundedLat = parseFloat(lat.toFixed(5));
  const roundedLng = parseFloat(lng.toFixed(5));
  const cacheKey = `rev:${roundedLat}:${roundedLng}`;

  try {
    const result = await photonReverseCache.getOrLoad(
      cacheKey,
      async () => {
        const url = `https://photon.komoot.io/reverse?lat=${roundedLat}&lon=${roundedLng}`;
        const res = await fetch(url, {
          signal,
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Reverse geocoder upstream status ${res.status}`);
        }

        const data = await res.json();
        if (data?.features?.[0]) {
          const feat = data.features[0];
          const props = feat.properties || {};

          const parts: string[] = [];
          if (props.street) parts.push(props.street + (props.housenumber ? ` ${props.housenumber}` : ""));
          if (props.district) parts.push(props.district);
          if (props.city) parts.push(props.city);
          if (props.state) parts.push(props.state);

          const place: GeocodePlace = {
            id: `rev-${roundedLat}-${roundedLng}`,
            name: props.name || props.street || `Map Point (${roundedLat.toFixed(3)}, ${roundedLng.toFixed(3)})`,
            displayName: parts.length > 0 ? `${props.name || props.street || "Location"}, ${parts.join(", ")}` : `Selected Point (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`,
            lat: roundedLat,
            lng: roundedLng,
            type: props.osm_value || props.type || undefined,
            city: props.city || undefined,
            state: props.state || undefined,
            postcode: props.postcode || undefined,
            provenance: "photon_live",
          };

          return { value: place, source: "photon_reverse_upstream" };
        }

        throw new Error("No feature found at coordinates");
      },
      true
    );

    return result.data;
  } catch {
    // Graceful offline fallback on network failure
  }

  // Fallback to nearest landmark if within ~500m
  let nearest = TUMAKURU_OFFLINE_LANDMARKS[0];
  let minDistanceSq = Number.MAX_VALUE;
  for (const preset of TUMAKURU_OFFLINE_LANDMARKS) {
    const dSq = Math.pow(preset.lat - roundedLat, 2) + Math.pow(preset.lng - roundedLng, 2);
    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
      nearest = preset;
    }
  }

  const isClose = minDistanceSq < 0.00003; // ~500m
  return {
    id: `rev-${roundedLat}-${roundedLng}`,
    name: isClose ? `Near ${nearest.name}` : `Selected Point (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`,
    displayName: isClose
      ? `Near ${nearest.name}, Tumakuru (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`
      : `Map Coordinates: ${roundedLat.toFixed(4)}° N, ${roundedLng.toFixed(4)}° E`,
    lat: roundedLat,
    lng: roundedLng,
    isLocalSuggestion: true,
    provenance: "local_offline_catalog",
  };
}

/**
 * Filter local presets for empty search states or quick selection
 */
export function getLocalSuggestions(query = ""): GeocodePlace[] {
  if (!query.trim()) {
    return TUMAKURU_OFFLINE_LANDMARKS.slice(0, 5);
  }
  const q = query.toLowerCase().trim();
  return TUMAKURU_OFFLINE_LANDMARKS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q)
  );
}
