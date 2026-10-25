import { z } from "zod";
import { weatherCache, antecedentCache } from "./cache/instances";

export interface HourlyForecastItem {
  time: string; // ISO string
  rain_mm: number;
}

export interface AntecedentRainfall {
  past_24h_mm: number;
  past_72h_mm: number;
  past_7d_mm: number;
  source: "open-meteo-historical" | "cache" | "unavailable";
  period_start: string;
  period_end: string;
  is_complete: boolean;
}

export interface WeatherData {
  rain_mm_next_3h: number;
  peak_hour: string;
  source: "open-meteo" | "cache";
  timeline?: HourlyForecastItem[];
  current_rain_mm?: number;
  temperature_c?: number;
  last_updated?: string;
  spatial_resolution?: "city_centroid";
  coverage_area?: string;
  antecedent?: AntecedentRainfall;
  isStale?: boolean;
}

const openMeteoResponseSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    precipitation: z.array(z.number()),
  }),
});

export const DEFAULT_MAP_CENTER = {
  lat: 13.3392,
  lng: 77.1140,
};

export function getMapCoordinates(): { lat: number; lng: number } {
  const latStr = process.env.NEXT_PUBLIC_MAP_CENTER_LAT;
  const lngStr = process.env.NEXT_PUBLIC_MAP_CENTER_LNG;
  const lat = latStr ? parseFloat(latStr) : DEFAULT_MAP_CENTER.lat;
  const lng = lngStr ? parseFloat(lngStr) : DEFAULT_MAP_CENTER.lng;
  return {
    lat: Number.isFinite(lat) ? lat : DEFAULT_MAP_CENTER.lat,
    lng: Number.isFinite(lng) ? lng : DEFAULT_MAP_CENTER.lng,
  };
}

export function resetWeatherCache(): void {
  weatherCache.clear();
  antecedentCache.clear();
}

export function setCachedWeather(data: WeatherData): void {
  const { lat, lng } = getMapCoordinates();
  weatherCache.set(`forecast:${lat.toFixed(3)}:${lng.toFixed(3)}`, data, "manual_override");
}

export function getCachedWeather(): WeatherData | null {
  const { lat, lng } = getMapCoordinates();
  const entry = weatherCache.get(`forecast:${lat.toFixed(3)}:${lng.toFixed(3)}`);
  return entry ? entry.value : null;
}

/**
 * Fetch Antecedent (Historical) Rainfall for previous 7 days using Open-Meteo Historical Weather API.
 * Uses bounded centralized AppCache with in-flight request deduplication.
 */
export async function getAntecedentRainfall(
  fetchFn: typeof fetch = fetch
): Promise<AntecedentRainfall> {
  const { lat, lng } = getMapCoordinates();
  const cacheKey = `antecedent:${lat.toFixed(3)}:${lng.toFixed(3)}`;

  const now = new Date();
  const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
  const startDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 7 days prior
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  try {
    const result = await antecedentCache.getOrLoad(
      cacheKey,
      async () => {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&hourly=precipitation&timezone=auto`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetchFn(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Open-Meteo Archive HTTP error: ${response.status}`);
        }

        const rawData = await response.json();
        const parsed = openMeteoResponseSchema.safeParse(rawData);

        if (!parsed.success) {
          throw new Error("Invalid Open-Meteo Archive response shape");
        }

        const { precipitation } = parsed.data.hourly;
        if (precipitation.length === 0) {
          throw new Error("Empty archive precipitation array");
        }

        const last24hSlice = precipitation.slice(-24);
        const past_24h_mm = Math.round(last24hSlice.reduce((sum, v) => sum + Math.max(0, v), 0) * 10) / 10;

        const last72hSlice = precipitation.slice(-72);
        const past_72h_mm = Math.round(last72hSlice.reduce((sum, v) => sum + Math.max(0, v), 0) * 10) / 10;

        const past_7d_mm = Math.round(precipitation.reduce((sum, v) => sum + Math.max(0, v), 0) * 10) / 10;

        const data: AntecedentRainfall = {
          past_24h_mm,
          past_72h_mm,
          past_7d_mm,
          source: "open-meteo-historical",
          period_start: startStr,
          period_end: endStr,
          is_complete: true,
        };

        return { value: data, source: "open-meteo-historical" };
      },
      true // allowStaleOnError
    );

    return result.data;
  } catch {
    // If archive fails completely and no cache exists, return honest unavailable status
    return {
      past_24h_mm: 0,
      past_72h_mm: 0,
      past_7d_mm: 0,
      source: "unavailable",
      period_start: startStr,
      period_end: endStr,
      is_complete: false,
    };
  }
}

/**
 * Fetch Weather Forecast from Open-Meteo API.
 * Uses bounded centralized AppCache with coalescing of concurrent identical requests.
 */
export async function getWeatherForecast(
  fetchFn: typeof fetch = fetch
): Promise<WeatherData> {
  const { lat, lng } = getMapCoordinates();
  const cacheKey = `forecast:${lat.toFixed(3)}:${lng.toFixed(3)}`;

  try {
    const cached = await weatherCache.getOrLoad(
      cacheKey,
      async () => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation&forecast_days=2&timezone=auto`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetchFn(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Open-Meteo HTTP error: ${response.status}`);
        }

        const rawData = await response.json();
        const parsed = openMeteoResponseSchema.safeParse(rawData);

        if (!parsed.success) {
          throw new Error("Invalid Open-Meteo response shape");
        }

        const { time, precipitation } = parsed.data.hourly;
        if (time.length === 0 || precipitation.length === 0) {
          throw new Error("Empty hourly precipitation data");
        }

        // Next 3 hours rain
        const next3hSlice = precipitation.slice(0, 3);
        const rainSumNext3h = next3hSlice.reduce((sum, val) => sum + Math.max(0, val), 0);
        const rain_mm_next_3h = Math.round(rainSumNext3h * 10) / 10;

        // Next 6 hours timeline
        const timeline: HourlyForecastItem[] = [];
        const timelineSlots = Math.min(12, time.length, precipitation.length);
        for (let i = 0; i < timelineSlots; i++) {
          timeline.push({
            time: time[i],
            rain_mm: Math.round((precipitation[i] || 0) * 10) / 10,
          });
        }

        // Peak hour in next 24h
        const next24hPrecip = precipitation.slice(0, 24);
        let peakIndex = 0;
        let peakVal = next24hPrecip[0] ?? 0;
        for (let i = 1; i < next24hPrecip.length; i++) {
          const val = next24hPrecip[i] ?? 0;
          if (val > peakVal) {
            peakVal = val;
            peakIndex = i;
          }
        }

        const peakTimeRaw = time[peakIndex] ?? "";
        let peak_hour = "N/A";
        if (peakTimeRaw) {
          const parsedDate = new Date(peakTimeRaw);
          if (!isNaN(parsedDate.getTime())) {
            peak_hour = parsedDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          } else {
            peak_hour = peakTimeRaw;
          }
        }

        // Antecedent check
        let antecedent: AntecedentRainfall | undefined;
        try {
          antecedent = await getAntecedentRainfall(fetchFn);
        } catch {
          antecedent = undefined;
        }

        const data: WeatherData = {
          rain_mm_next_3h,
          peak_hour,
          source: "open-meteo",
          timeline,
          last_updated: new Date().toISOString(),
          spatial_resolution: "city_centroid",
          coverage_area: "Tumakuru Municipal Area (Grid Resolution ~11km)",
          antecedent,
        };

        return { value: data, source: "open-meteo" };
      },
      true // allowStaleOnError
    );

    const isCachedResult = cached.cached && cached.source !== "open-meteo";
    return {
      ...cached.data,
      source: isCachedResult ? "cache" : "open-meteo",
      isStale: cached.isStale,
    };
  } catch {
    return {
      rain_mm_next_3h: 0,
      peak_hour: "N/A",
      source: "cache",
      timeline: [],
      last_updated: new Date().toISOString(),
      spatial_resolution: "city_centroid",
      coverage_area: "Tumakuru Municipal Area (Fallback Cache)",
    };
  }
}
