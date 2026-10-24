"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { RainSlider } from "@/components/RainSlider";
import { ZonePanel } from "@/components/ZonePanel";
import { MapWrapper } from "@/components/MapWrapper";
import { Zone, ZoneRisk } from "@/lib/types";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function HomePage() {
  const [forecastRain, setForecastRain] = useState<number>(0);
  const [peakHour, setPeakHour] = useState<string>("N/A");
  const [currentRain, setCurrentRain] = useState<number>(0);
  const [zones, setZones] = useState<(Zone & { risk: ZoneRisk })[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(true);
  const [isZonesLoading, setIsZonesLoading] = useState<boolean>(true);
  const [isUpdatingRisk, setIsUpdatingRisk] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Fetch initial live forecast and zones
  const initializeData = useCallback(async () => {
    setIsWeatherLoading(true);
    setIsZonesLoading(true);
    setErrorMessage(null);

    let initialRain = 0;
    try {
      const weatherRes = await fetch("/api/weather");
      if (weatherRes.ok) {
        const weatherJson = await weatherRes.json();
        if (weatherJson.data) {
          initialRain = weatherJson.data.rain_mm_next_3h || 0;
          setForecastRain(initialRain);
          setCurrentRain(initialRain);
          setPeakHour(weatherJson.data.peak_hour || "N/A");
        }
      }
    } catch {
      // Fallback silently handles weather failure
      setForecastRain(0);
      setCurrentRain(0);
    } finally {
      setIsWeatherLoading(false);
    }

    try {
      const zonesRes = await fetch(`/api/zones?rain_mm=${initialRain}`);
      if (!zonesRes.ok) throw new Error("Failed to load street risk zones");
      const zonesJson = await zonesRes.json();
      if (zonesJson.data?.zones) {
        setZones(zonesJson.data.zones);
        if (zonesJson.data.zones.length > 0) {
          setSelectedZoneId(zonesJson.data.zones[0].id);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load street risk zones."
      );
    } finally {
      setIsZonesLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Handle slider adjustment with debounced API queries and race condition prevention
  const handleRainChange = (newRain: number) => {
    setCurrentRain(newRain);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsUpdatingRisk(true);
    const requestId = ++activeRequestIdRef.current;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/zones?rain_mm=${newRain}`);
        if (!res.ok) throw new Error("Failed to recalculate risk scores");
        const json = await res.json();

        // Avoid stale overwrites
        if (requestId === activeRequestIdRef.current && json.data?.zones) {
          setZones(json.data.zones);
        }
      } catch {
        // Retain current zones on transient failure
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsUpdatingRisk(false);
        }
      }
    }, 150);
  };

  // Reset to live forecast
  const handleResetToForecast = () => {
    handleRainChange(forecastRain);
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-slate-100 overflow-hidden">
      <Header />

      {errorMessage ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-white">Hydrological Service Unavailable</h2>
            <p className="text-xs text-slate-400 mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={() => initializeData()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </div>
      ) : (
        <main className="flex-1 p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 overflow-hidden max-w-[1700px] w-full mx-auto">
          {/* Main Map Workspace (8 Cols on Desktop) */}
          <section
            aria-label="Interactive Cartography"
            className="lg:col-span-8 flex flex-col space-y-3 h-[50vh] lg:h-auto min-h-[440px] relative"
          >
            {/* Embedded Floating Rain Control on Desktop / Pinned on Mobile */}
            <div className="z-10 w-full">
              <RainSlider
                currentRain={currentRain}
                forecastRain={forecastRain}
                peakHour={peakHour}
                isWeatherLoading={isWeatherLoading}
                isUpdatingRisk={isUpdatingRisk}
                onRainChange={handleRainChange}
                onReset={handleResetToForecast}
              />
            </div>

            {/* Map Canvas */}
            <div className="flex-1 w-full relative min-h-[350px]">
              {isZonesLoading ? (
                <div className="w-full h-full min-h-[350px] rounded-xl border border-slate-700/60 bg-[#0B1220] flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span className="text-xs font-medium">Loading street zone geometries...</span>
                </div>
              ) : (
                <MapWrapper
                  zones={zones}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={(z) => setSelectedZoneId(z.id)}
                  center={[13.3392, 77.1140]}
                  zoom={14}
                />
              )}
            </div>
          </section>

          {/* Detailed Risk Explanation Panel (4 Cols on Desktop) */}
          <aside
            aria-label="Selected Zone Intelligence"
            className="lg:col-span-4 h-full overflow-y-auto"
          >
            <ZonePanel
              selectedZone={selectedZone}
              currentRain={currentRain}
            />
          </aside>
        </main>
      )}
    </div>
  );
}
