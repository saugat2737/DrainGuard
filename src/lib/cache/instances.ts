import { AppCache, CACHE_POLICIES } from "./app-cache";
import { GeocodePlace } from "../geocoding";
import { WeatherData, AntecedentRainfall } from "../weather";
import { ScoredRoute } from "../routing";
import { SystemStatusReport } from "../service-status";

// Singletons for process-local bounded caches
export const photonSearchCache = new AppCache<GeocodePlace[]>(CACHE_POLICIES.photonSearch);
export const photonReverseCache = new AppCache<GeocodePlace>(CACHE_POLICIES.photonReverse);
export const weatherCache = new AppCache<WeatherData>(CACHE_POLICIES.weatherForecast);
export const antecedentCache = new AppCache<AntecedentRainfall>(CACHE_POLICIES.antecedentRain);
export const osrmRouteCache = new AppCache<{ coordinates: [number, number][]; duration: number; distance: number }[]>(
  CACHE_POLICIES.osrmRoute
);
export const statusSummaryCache = new AppCache<SystemStatusReport>(CACHE_POLICIES.serviceStatus);

/**
 * Reset all process-local caches (useful in testing)
 */
export function resetAllCaches(): void {
  photonSearchCache.clear();
  photonReverseCache.clear();
  weatherCache.clear();
  antecedentCache.clear();
  osrmRouteCache.clear();
  statusSummaryCache.clear();
}
