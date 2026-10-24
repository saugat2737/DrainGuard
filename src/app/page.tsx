"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { MapWrapper } from "@/components/MapWrapper";
import { JourneyPlanner } from "@/components/JourneyPlanner";
import { ZonePanel } from "@/components/ZonePanel";
import { WeatherModal } from "@/components/WeatherModal";
import { LayerControls } from "@/components/LayerControls";
import { ReportForm } from "@/components/ReportForm";
import { ServiceStatusDrawer } from "@/components/ServiceStatusDrawer";
import { Zone, ZoneRisk } from "@/lib/types";
import { RouteComparisonResult } from "@/lib/routing";
import { HourlyForecastItem } from "@/lib/weather";
import { recordWeatherSuccess, recordRoutingSuccess, recordRoutingFailure } from "@/lib/service-status";
import {
  AlertCircle,
  RefreshCw,
  Navigation,
  Sliders,
  ChevronUp,
  ChevronDown,
  Layers,
  MapPin,
  ShieldAlert,
  Server,
} from "lucide-react";

export default function HomePage() {
  const [forecastRain, setForecastRain] = useState<number>(0);
  const [peakHour, setPeakHour] = useState<string>("None");
  const [timeline, setTimeline] = useState<HourlyForecastItem[]>([]);
  const [currentRain, setCurrentRain] = useState<number>(0);
  const [zones, setZones] = useState<(Zone & { risk: ZoneRisk })[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(true);
  const [isZonesLoading, setIsZonesLoading] = useState<boolean>(true);
  const [isUpdatingRisk, setIsUpdatingRisk] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Panels state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState<boolean>(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"journey" | "zone">("journey");

  // Mobile Bottom Sheet state ('collapsed' | 'half' | 'expanded')
  const [mobileSheetState, setMobileSheetState] = useState<"half" | "collapsed" | "expanded">("half");

  // Layers state
  const [showRiskZones, setShowRiskZones] = useState<boolean>(true);
  const [showReportsLayer, setShowReportsLayer] = useState<boolean>(true);

  // Routing state
  const [routeResult, setRouteResult] = useState<RouteComparisonResult | null>(null);
  const [activeDisplayRoute, setActiveDisplayRoute] = useState<"fastest" | "safest" | "balanced">("safest");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  const isSimulated = Math.abs(currentRain - forecastRain) > 0.1;

  // Initialize data
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
          setPeakHour(weatherJson.data.peak_hour || "None");
          setTimeline(weatherJson.data.timeline || []);
        }
      }
    } catch {
      setForecastRain(0);
      setCurrentRain(0);
    } finally {
      setIsWeatherLoading(false);
    }

    try {
      const zonesRes = await fetch(`/api/zones?rain_mm=${initialRain}`);
      if (!zonesRes.ok) throw new Error("Unable to load street flood risk areas.");
      const zonesJson = await zonesRes.json();
      if (zonesJson.data?.zones) {
        setZones(zonesJson.data.zones);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load street risk areas. Please check your network."
      );
    } finally {
      setIsZonesLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Handle rain simulation adjustment
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

        if (requestId === activeRequestIdRef.current && json.data?.zones) {
          setZones(json.data.zones);
        }
      } catch {
        // Keep current on transient error
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsUpdatingRisk(false);
        }
      }
    }, 150);
  };

  const handleResetToForecast = () => {
    handleRainChange(forecastRain);
  };

  const handleSelectZoneOnMap = (zone: Zone & { risk: ZoneRisk }) => {
    setSelectedZoneId(zone.id);
    setActiveTab("zone");
    if (mobileSheetState === "collapsed") {
      setMobileSheetState("half");
    }
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || null;

  const activeRouteGeometry = routeResult
    ? activeDisplayRoute === "safest"
      ? routeResult.safest.geometry.coordinates
      : activeDisplayRoute === "balanced" && routeResult.balanced
      ? routeResult.balanced.geometry.coordinates
      : routeResult.fastest.geometry.coordinates
    : null;

  const activeRouteData = routeResult
    ? activeDisplayRoute === "safest"
      ? routeResult.safest
      : activeDisplayRoute === "balanced" && routeResult.balanced
      ? routeResult.balanced
      : routeResult.fastest
    : null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B1220] text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <Header
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenStatusDrawer={() => setIsStatusDrawerOpen(true)}
        isSimulated={isSimulated}
      />

      {errorMessage ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-white">Service Temporarily Unavailable</h2>
            <p className="text-xs text-slate-400 mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={() => initializeData()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </button>
        </div>
      ) : (
        <div className="flex-1 relative w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
          {/* Viewport-filling Leaflet Map */}
          <div className="absolute inset-0 z-0">
            {isZonesLoading ? (
              <div className="w-full h-full bg-[#0B1220] flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span className="text-xs font-medium">Loading street map and flood corridors...</span>
              </div>
            ) : (
              <MapWrapper
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZoneOnMap}
                center={[13.3392, 77.1140]}
                zoom={14}
                routeGeometry={activeRouteGeometry}
                routeType={activeDisplayRoute}
                showRiskZones={showRiskZones}
                showReportsLayer={showReportsLayer}
                hazardHotspots={activeRouteData?.hazard_hotspots || []}
                onSelectHotspot={(zoneId) => {
                  setSelectedZoneId(zoneId);
                  setActiveTab("zone");
                }}
              />
            )}
          </div>

          {/* Floating Map Layer Controls (Top-Right) */}
          <LayerControls
            showRiskZones={showRiskZones}
            setShowRiskZones={setShowRiskZones}
            showReportsLayer={showReportsLayer}
            setShowReportsLayer={setShowReportsLayer}
            isSimulated={isSimulated}
            currentRain={currentRain}
            forecastRain={forecastRain}
            onOpenSliderModal={() => setIsWeatherModalOpen(true)}
            onResetToForecast={handleResetToForecast}
            onOpenStatusDrawer={() => setIsStatusDrawerOpen(true)}
          />

          {/* Floating Desktop Panel (Left Sidebar Overlay) */}
          <div className="hidden lg:block absolute top-4 left-4 z-[450] w-[420px] max-h-[calc(100vh-6rem)] overflow-y-auto space-y-3 pb-4 pointer-events-auto">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-[#0B1220]/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 shadow-xl">
              <button
                onClick={() => setActiveTab("journey")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "journey"
                    ? "bg-[#142235] text-cyan-400 border border-slate-700/80 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Trip Planner</span>
              </button>

              <button
                onClick={() => setActiveTab("zone")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "zone"
                    ? "bg-[#142235] text-cyan-400 border border-slate-700/80 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Road Details</span>
                {selectedZone && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                )}
              </button>
            </div>

            {/* Active Tab Content */}
            {activeTab === "journey" ? (
              <JourneyPlanner
                currentRain={currentRain}
                isSimulated={isSimulated}
                onRoutesCalculated={(res) => setRouteResult(res)}
                onSelectRouteDisplay={(type) => setActiveDisplayRoute(type)}
                activeDisplayRoute={activeDisplayRoute}
                onSelectHotspot={(zoneId) => {
                  setSelectedZoneId(zoneId);
                  setActiveTab("zone");
                }}
                onOpenStatusDrawer={() => setIsStatusDrawerOpen(true)}
              />
            ) : (
              <ZonePanel
                selectedZone={selectedZone}
                currentRain={currentRain}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                onClose={() => setActiveTab("journey")}
              />
            )}
          </div>

          {/* Mobile Bottom Sheet (Namma Yatri Pattern) */}
          <div
            className={`lg:hidden absolute left-0 right-0 bottom-0 z-[500] bg-[#142235] border-t border-slate-700/80 rounded-t-3xl shadow-sheet transition-all duration-300 ease-out flex flex-col ${
              mobileSheetState === "collapsed"
                ? "h-14"
                : mobileSheetState === "half"
                ? "h-[50vh]"
                : "h-[85vh]"
            }`}
          >
            {/* Drag Handle & State Toggles */}
            <div
              onClick={() => {
                if (mobileSheetState === "collapsed") setMobileSheetState("half");
                else if (mobileSheetState === "half") setMobileSheetState("expanded");
                else setMobileSheetState("collapsed");
              }}
              className="w-full py-2 flex flex-col items-center justify-center cursor-pointer select-none shrink-0"
              aria-label="Expand or collapse bottom sheet"
            >
              <div className="w-12 h-1.5 bg-slate-600 rounded-full mb-1" />
              <div className="w-full px-4 flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-[#38BDF8]" />
                  {activeTab === "journey" ? "Plan Safe Trip" : selectedZone?.name || "Road Details"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {mobileSheetState === "collapsed" ? "Tap to open" : "Tap to adjust height"}
                </span>
              </div>
            </div>

            {/* Scrollable Content inside Bottom Sheet */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-8">
              {/* Tab Selector on Mobile */}
              <div className="flex items-center gap-1 bg-[#0B1220] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab("journey")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    activeTab === "journey"
                      ? "bg-[#142235] text-cyan-400 border border-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  Trip Planning
                </button>
                <button
                  onClick={() => setActiveTab("zone")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    activeTab === "zone"
                      ? "bg-[#142235] text-cyan-400 border border-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  Road Info ({selectedZone ? selectedZone.name.slice(0, 10) + "..." : "None"})
                </button>
              </div>

              {activeTab === "journey" ? (
                <JourneyPlanner
                  currentRain={currentRain}
                  isSimulated={isSimulated}
                  onRoutesCalculated={(res) => setRouteResult(res)}
                  onSelectRouteDisplay={(type) => setActiveDisplayRoute(type)}
                  activeDisplayRoute={activeDisplayRoute}
                  onSelectHotspot={(zoneId) => {
                    setSelectedZoneId(zoneId);
                    setActiveTab("zone");
                  }}
                  onOpenStatusDrawer={() => setIsStatusDrawerOpen(true)}
                />
              ) : (
                <ZonePanel
                  selectedZone={selectedZone}
                  currentRain={currentRain}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                  onClose={() => setActiveTab("journey")}
                />
              )}
            </div>
          </div>

          {/* Floating Map Bottom-Left Legend */}
          <div className="hidden sm:flex absolute bottom-4 left-4 lg:left-[445px] z-[400] bg-[#0B1220]/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl shadow-xl text-slate-200 text-xs items-center gap-3">
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
              Flood Hazard:
            </span>
            <span className="flex items-center gap-1 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> Low (0-29)
            </span>
            <span className="flex items-center gap-1 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#F5B942]" /> Moderate (30-59)
            </span>
            <span className="flex items-center gap-1 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#F97316]" /> High (60-79)
            </span>
            <span className="flex items-center gap-1 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Severe (80-100)
            </span>
          </div>
        </div>
      )}

      {/* Weather & Rain Simulation Modal */}
      <WeatherModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        currentRain={currentRain}
        forecastRain={forecastRain}
        peakHour={peakHour}
        timeline={timeline}
        isWeatherLoading={isWeatherLoading}
        isUpdatingRisk={isUpdatingRisk}
        onRainChange={handleRainChange}
        onReset={handleResetToForecast}
      />

      {/* Service Status & Transparency Drawer */}
      <ServiceStatusDrawer
        isOpen={isStatusDrawerOpen}
        onClose={() => setIsStatusDrawerOpen(false)}
      />

      {/* Citizen Blockage Report Modal */}
      {isReportModalOpen && (
        <ReportForm
          zones={zones}
          selectedZone={selectedZone}
          onClose={() => setIsReportModalOpen(false)}
          onReportSubmitted={async (matchedZoneId) => {
            try {
              const res = await fetch(`/api/zones?rain_mm=${currentRain}`);
              if (res.ok) {
                const json = await res.json();
                if (json.data?.zones) {
                  setZones(json.data.zones);
                  if (matchedZoneId) {
                    setSelectedZoneId(matchedZoneId);
                    setActiveTab("zone");
                  }
                }
              }
            } catch {
              // Silently handle
            }
          }}
        />
      )}
    </div>
  );
}
