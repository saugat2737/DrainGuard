/**
 * Geocoding Service Adapter for DrainGuard
 * 
 * Complies with strict Zero-Cost and Open Data policy:
 * - Uses Photon (by Komoot), an open-source geocoding service built on OpenStreetMap / Nominatim data.
 * - Free public endpoint without API key: https://photon.komoot.io/api/
 * - Supports forward search with Tumakuru geographic bias and reverse geocoding for "Pick on Map".
 * - Never hits OSM Nominatim for autocomplete keystrokes (strictly respecting OSM Foundation usage policy).
 * - Implements in-memory caching, input sanitization, and fallback to local landmark presets.
 */

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
}

// Representative presets around Tumakuru serving as instant local suggestions or fallback during geocoder downtime
export const TUMAKURU_FALLBACK_PRESETS: GeocodePlace[] = [
  {
    id: "preset-railway",
    name: "Tumakuru Railway Station",
    displayName: "Tumakuru Railway Station, Mandipet, Tumakuru, Karnataka 572101",
    lat: 13.3465,
    lng: 77.1215,
    type: "railway_station",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
  },
  {
    id: "preset-ksrtc",
    name: "Tumkur KSRTC Bus Stand",
    displayName: "Tumkur KSRTC Bus Stand, KSRTC Link Road, Tumakuru, Karnataka 572101",
    lat: 13.3411,
    lng: 77.1025,
    type: "bus_station",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
  },
  {
    id: "preset-siddaganga-math",
    name: "Siddaganga Math",
    displayName: "Siddaganga Math, Kyatsandra, Tumakuru, Karnataka 572104",
    lat: 13.3155,
    lng: 77.1428,
    type: "monastery",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572104",
    isLocalSuggestion: true,
  },
  {
    id: "preset-dc-office",
    name: "Tumakuru DC Office (District Collectorate)",
    displayName: "DC Office Complex, Mini Vidhana Soudha, Tumakuru, Karnataka 572101",
    lat: 13.3382,
    lng: 77.1075,
    type: "government",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
  },
  {
    id: "preset-amanikere",
    name: "Amanikere Lake Promenade",
    displayName: "Amanikere Lake North Shore, Tumakuru, Karnataka 572102",
    lat: 13.3440,
    lng: 77.1140,
    type: "lake",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572102",
    isLocalSuggestion: true,
  },
  {
    id: "preset-gubbi-gate",
    name: "Gubbi Gate Market",
    displayName: "Gubbi Gate Circle, B.H. Road, Tumakuru, Karnataka 572101",
    lat: 13.3370,
    lng: 77.1020,
    type: "marketplace",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
  },
  {
    id: "preset-mg-road",
    name: "MG Road Commercial Corridor",
    displayName: "Mahatma Gandhi Road, Ward 12, Tumakuru, Karnataka 572101",
    lat: 13.3395,
    lng: 77.1090,
    type: "commercial",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572101",
    isLocalSuggestion: true,
  },
  {
    id: "preset-batawadi",
    name: "Batawadi Junction (NH 48)",
    displayName: "Batawadi Cross, NH 48 / Ring Road, Tumakuru, Karnataka 572103",
    lat: 13.3280,
    lng: 77.1350,
    type: "junction",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572103",
    isLocalSuggestion: true,
  },
  {
    id: "preset-university",
    name: "Tumkur University Campus",
    displayName: "Tumkur University, B.H. Road, Tumakuru, Karnataka 572103",
    lat: 13.3262,
    lng: 77.1265,
    type: "university",
    city: "Tumakuru",
    state: "Karnataka",
    postcode: "572103",
    isLocalSuggestion: true,
  },
];

// Tumakuru reference centroid for geographic bias
export const TUMAKURU_CENTROID = {
  lat: 13.3392,
  lng: 77.1140,
};

// Simple in-memory cache to prevent repetitive network requests
const searchCache = new Map<string, { data: GeocodePlace[]; timestamp: number }>();
const reverseCache = new Map<string, { data: GeocodePlace; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Searches places via Photon Geocoder with Tumakuru geographic bias
 */
export async function searchPlaces(
  query: string,
  options?: {
    limit?: number;
    latBias?: number;
    lngBias?: number;
    signal?: AbortSignal;
  }
): Promise<{ places: GeocodePlace[]; provider: "photon" | "local_fallback"; cached: boolean }> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { places: [], provider: "photon", cached: false };
  }

  const limit = options?.limit || 5;
  const latBias = options?.latBias ?? TUMAKURU_CENTROID.lat;
  const lngBias = options?.lngBias ?? TUMAKURU_CENTROID.lng;
  const cacheKey = `${trimmed.toLowerCase()}_${limit}_${latBias.toFixed(3)}_${lngBias.toFixed(3)}`;

  // 1. Check in-memory cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { places: cached.data, provider: "photon", cached: true };
  }

  // 2. Query Photon API (Free, zero-cost, no key required)
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    trimmed
  )}&lat=${latBias}&lon=${lngBias}&zoom=13&location_bias_scale=0.3&limit=${limit}`;

  try {
    const res = await fetch(url, {
      signal: options?.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Photon upstream status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) {
      throw new Error("Invalid Photon response schema");
    }

    const places: GeocodePlace[] = data.features.map((feature: any, index: number) => {
      const coords = feature.geometry?.coordinates || [0, 0];
      const props = feature.properties || {};

      // Photon returns [longitude, latitude]
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
      };
    });

    // Populate cache
    searchCache.set(cacheKey, { data: places, timestamp: Date.now() });

    return { places, provider: "photon", cached: false };
  } catch (err: unknown) {
    if ((err as any)?.name === "AbortError") {
      throw err;
    }

    // Geocoder downtime fallback: match against local Tumakuru presets
    const queryLower = trimmed.toLowerCase();
    const matchedPresets = TUMAKURU_FALLBACK_PRESETS.filter(
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
  const cacheKey = `${roundedLat},${roundedLng}`;

  const cached = reverseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://photon.komoot.io/reverse?lat=${roundedLat}&lon=${roundedLng}`;

  try {
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
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
        };

        reverseCache.set(cacheKey, { data: place, timestamp: Date.now() });
        return place;
      }
    }
  } catch {
    // Graceful fallback on network error or abort
  }

  // Fallback to nearest preset or coordinates
  let nearest = TUMAKURU_FALLBACK_PRESETS[0];
  let minDistanceSq = Number.MAX_VALUE;
  for (const preset of TUMAKURU_FALLBACK_PRESETS) {
    const dSq = Math.pow(preset.lat - roundedLat, 2) + Math.pow(preset.lng - roundedLng, 2);
    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
      nearest = preset;
    }
  }

  // If within ~500m of a known landmark, identify with nearest reference
  const isClose = minDistanceSq < 0.00003; // ~500m
  const fallbackPlace: GeocodePlace = {
    id: `rev-${roundedLat}-${roundedLng}`,
    name: isClose ? `Near ${nearest.name}` : `Selected Point (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`,
    displayName: isClose
      ? `Near ${nearest.name}, Tumakuru (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`
      : `Map Coordinates: ${roundedLat.toFixed(4)}° N, ${roundedLng.toFixed(4)}° E`,
    lat: roundedLat,
    lng: roundedLng,
    isLocalSuggestion: true,
  };

  reverseCache.set(cacheKey, { data: fallbackPlace, timestamp: Date.now() });
  return fallbackPlace;
}

/**
 * Filter local presets for empty search states or quick selection
 */
export function getLocalSuggestions(query = ""): GeocodePlace[] {
  if (!query.trim()) {
    return TUMAKURU_FALLBACK_PRESETS.slice(0, 5);
  }
  const q = query.toLowerCase().trim();
  return TUMAKURU_FALLBACK_PRESETS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q)
  );
}
