import { z } from "zod";

export interface WeatherData {
  rain_mm_next_3h: number;
  peak_hour: string;
  source: "open-meteo" | "cache";
}

const openMeteoResponseSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    precipitation: z.array(z.number()),
  }),
});

let cachedWeather: WeatherData | null = null;

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
  cachedWeather = null;
}

export function setCachedWeather(data: WeatherData): void {
  cachedWeather = data;
}

export async function getWeatherForecast(
  fetchFn: typeof fetch = fetch
): Promise<WeatherData> {
  const { lat, lng } = getMapCoordinates();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation&forecast_days=2&timezone=auto`;

  try {
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

    // Determine precipitation over next 3 hours
    // If times are aligned with now, take the first 3 available hourly slots
    const next3hSlice = precipitation.slice(0, 3);
    const rainSumNext3h = next3hSlice.reduce((sum, val) => sum + Math.max(0, val), 0);
    const rain_mm_next_3h = Math.round(rainSumNext3h * 10) / 10;

    // Determine peak precipitation hour within the next 24 hours
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

    const result: WeatherData = {
      rain_mm_next_3h,
      peak_hour,
      source: "open-meteo",
    };

    cachedWeather = result;
    return result;
  } catch (err) {
    // Return cached forecast if available
    if (cachedWeather) {
      return {
        ...cachedWeather,
        source: "cache",
      };
    }

    // Safe zero-rain fallback
    return {
      rain_mm_next_3h: 0,
      peak_hour: "N/A",
      source: "cache",
    };
  }
}
