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
import { MapSearchBar } from "@/components/MapSearchBar";
import { Zone, ZoneRisk } from "@/lib/types";
import { RouteComparisonResult } from "@/lib/routing";
import { HourlyForecastItem } from "@/lib/weather";
import { GeocodePlace, TUMAKURU_CENTROID, TUMAKURU_FALLBACK_PRESETS } from "@/lib/geocoding";
import {
  AlertCircle,
  RefreshCw,
  Navigation,
  ShieldAlert,
  Check,
  X,
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

  // Layers state & Basemap
  const [showRiskZones, setShowRiskZones] = useState<boolean>(true);
  const [showReportsLayer, setShowReportsLayer] = useState<boolean>(true);
  const [basemapId, setBasemapId] = useState<"osm_streets" | "opentopo_terrain">("osm_streets");

  // Routing & Places state
  const [originPlace, setOriginPlace] = useState<GeocodePlace | null>(TUMAKURU_FALLBACK_PRESETS[0]);
  const [destinationPlace, setDestinationPlace] = useState<GeocodePlace | null>(TUMAKURU_FALLBACK_PRESETS[1]);
  const [routeResult, setRouteResult] = useState<RouteComparisonResult | null>(null);
  const [activeDisplayRoute, setActiveDisplayRoute] = useState<"fastest" | "safest" | "balanced">("safest");

  // Map camera & searched landmark state
  const [mapCenter, setMapCenter] = useState<[number, number]>([TUMAKURU_CENTROID.lat, TUMAKURU_CENTROID.lng]);
  const [mapZoom, setMapZoom] = useState<number>(14);
  const [searchedPlace, setSearchedPlace] = useState<GeocodePlace | null>(null);

  // "Pick on Map" mode state
  const [pickingTarget, setPickingTarget] = useState<"origin" | "destination" | null>(null);
  const [pendingPickCoord, setPendingPickCoord] = useState<{ lat: number; lng: number; label?: string } | null>(null);

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

    const requestId = ++activeRequestIdRef.current;
    setIsUpdatingRisk(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/zones?rain_mm=${newRain}`);
        if (!res.ok) throw new Error("Failed to recalculate risk scores");
        const json = await res.json();

        if (requestId === activeRequestIdRef.current && json.data?.zones) {
          setZones(json.data.zones);
        }
      } catch {
        // Silently preserve current scores
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsUpdatingRisk(false);
        }
      }
    }, 250);
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

  // Map camera centering on search
  const handleSelectSearchedPlace = (place: GeocodePlace, action?: "fly" | "set_origin" | "set_dest") => {
    setSearchedPlace(place);
    setMapCenter([place.lat, place.lng]);
    setMapZoom(16);

    if (action === "set_origin") {
      setOriginPlace(place);
      setActiveTab("journey");
    } else if (action === "set_dest") {
      setDestinationPlace(place);
      setActiveTab("journey");
    }
  };

  // Pick-on-map lifecycle
  const handleStartPickOnMap = (target: "origin" | "destination") => {
    setPickingTarget(target);
    setPendingPickCoord(null);
    if (mobileSheetState !== "collapsed") {
      setMobileSheetState("collapsed");
    }
  };

  const handleMapClickCoord = async (lat: number, lng: number) => {
    if (!pickingTarget) return;

    setPendingPickCoord({ lat, lng, label: "Resolving address..." });

    try {
      const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setPendingPickCoord({
            lat,
            lng,
            label: json.data.name || json.data.displayName,
          });
          return;
        }
      }
    } catch {
      // Fallback to coordinates
    }

    setPendingPickCoord({
      lat,
      lng,
      label: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    });
  };

  const handleConfirmPick = () => {
    if (!pendingPickCoord || !pickingTarget) return;

    const newPlace: GeocodePlace = {
      id: `picked_${Date.now()}`,
      name: pendingPickCoord.label || `${pendingPickCoord.lat.toFixed(4)}, ${pendingPickCoord.lng.toFixed(4)}`,
      displayName: pendingPickCoord.label || `Custom map location (${pendingPickCoord.lat.toFixed(4)}, ${pendingPickCoord.lng.toFixed(4)})`,
      lat: pendingPickCoord.lat,
      lng: pendingPickCoord.lng,
    };

    if (pickingTarget === "origin") {
      setOriginPlace(newPlace);
    } else {
      setDestinationPlace(newPlace);
    }

    setPickingTarget(null);
    setPendingPickCoord(null);
    setMobileSheetState("half");
    setActiveTab("journey");
  };

  const handleCancelPick = () => {
    setPickingTarget(null);
    setPendingPickCoord(null);
    setMobileSheetState("half");
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
    <div className="h-screen w-screen flex flex-col bg-[var(--dg-page-bg)] text-[var(--dg-text)] overflow-hidden select-none transition-colors">
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
            <h2 className="text-lg font-bold text-[var(--dg-text)]">Service Temporarily Unavailable</h2>
            <p className="text-xs text-[var(--dg-text-secondary)] mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={() => initializeData()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </button>
        </div>
      ) : (
        <div className="flex-1 w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex overflow-hidden relative">
          {/* Dedicated Left Planning Sidebar (Desktop) */}
          <aside className="hidden lg:flex flex-col w-[420px] xl:w-[440px] shrink-0 h-full border-r border-[var(--dg-border)] bg-[var(--dg-sidebar-bg)] z-20 overflow-hidden shadow-md">
            {/* Sticky Sidebar Header with Mode/Tab Switcher */}
            <div className="p-3.5 border-b border-[var(--dg-border-subtle)] bg-[var(--dg-surface-card)] shrink-0">
              <div className="flex items-center gap-1 bg-[var(--dg-surface-muted)] p-1 rounded-xl border border-[var(--dg-border)]">
                <button
                  onClick={() => setActiveTab("journey")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === "journey"
                      ? "bg-[var(--dg-surface-card)] text-cyan-600 dark:text-cyan-400 border border-[var(--dg-border)] shadow-sm"
                      : "text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)]"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Trip Planner</span>
                </button>

                <button
                  onClick={() => setActiveTab("zone")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === "zone"
                      ? "bg-[var(--dg-surface-card)] text-cyan-600 dark:text-cyan-400 border border-[var(--dg-border)] shadow-sm"
                      : "text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)]"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Road Hazards</span>
                  {selectedZone && (
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Panel Area with Reliable Scrollbar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  onStartPickOnMap={handleStartPickOnMap}
                  activePickingTarget={pickingTarget}
                  originPlace={originPlace}
                  destinationPlace={destinationPlace}
                  onChangeOrigin={setOriginPlace}
                  onChangeDestination={setDestinationPlace}
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
          </aside>

          {/* Interactive Map Area occupying Remaining Viewport */}
          <main className="flex-1 h-full relative overflow-hidden z-0">
            <div className="absolute inset-0 z-0">
            {isZonesLoading ? (
              <div className="w-full h-full bg-[var(--dg-page-bg)] flex flex-col items-center justify-center text-[var(--dg-text-muted)] gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                <span className="text-xs font-medium">Loading cartography and flood evidence...</span>
              </div>
            ) : (
              <MapWrapper
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZoneOnMap}
                center={mapCenter}
                zoom={mapZoom}
                routeGeometry={activeRouteGeometry}
                routeType={activeDisplayRoute}
                showRiskZones={showRiskZones}
                showReportsLayer={showReportsLayer}
                hazardHotspots={activeRouteData?.hazard_hotspots || []}
                onSelectHotspot={(zoneId) => {
                  setSelectedZoneId(zoneId);
                  setActiveTab("zone");
                }}
                basemapId={basemapId}
                isPickingOnMap={!!pickingTarget}
                pickingTarget={pickingTarget}
                onMapClickCoord={handleMapClickCoord}
                originPlace={originPlace}
                destinationPlace={destinationPlace}
                searchedPlace={searchedPlace}
                onClearSearchedPlace={() => setSearchedPlace(null)}
                onSetSearchedPlaceAsOrigin={(p) => {
                  setOriginPlace(p);
                  setSearchedPlace(null);
                  setActiveTab("journey");
                }}
                onSetSearchedPlaceAsDestination={(p) => {
                  setDestinationPlace(p);
                  setSearchedPlace(null);
                  setActiveTab("journey");
                }}
              />
            )}
          </div>

          {/* Floating Map Search Bar (Top-Center) */}
          <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-[420] flex justify-center pointer-events-auto">
            <MapSearchBar onSelectPlace={handleSelectSearchedPlace} />
          </div>

          {/* Dedicated "Pick on Map" Instruction & Action Banner */}
          {pickingTarget && (
            <div className="absolute top-16 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[460px] z-[460] bg-[var(--dg-surface-card)] backdrop-blur-md border border-cyan-500 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-500 animate-ping shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--dg-text)] uppercase tracking-wider">
                      Tap map to choose {pickingTarget === "origin" ? "Starting Point" : "Destination"}
                    </h4>
                    <p className="text-[11px] text-cyan-600 dark:text-cyan-300 truncate max-w-[240px]">
                      {pendingPickCoord
                        ? pendingPickCoord.label || `${pendingPickCoord.lat.toFixed(4)}, ${pendingPickCoord.lng.toFixed(4)}`
                        : "Click anywhere on the streets to drop pin"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleConfirmPick}
                    disabled={!pendingPickCoord}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={handleCancelPick}
                    className="p-1.5 rounded-xl bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] border border-[var(--dg-border)] text-[var(--dg-text-secondary)] hover:text-[var(--dg-text)] transition"
                    aria-label="Cancel picking"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

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
            basemapId={basemapId}
            setBasemapId={setBasemapId}
          />



          {/* Mobile Bottom Sheet */}
          <div
            className={`lg:hidden absolute left-0 right-0 bottom-0 z-[500] bg-[var(--dg-surface-card)] border-t border-[var(--dg-border)] rounded-t-3xl shadow-sheet transition-all duration-300 ease-out flex flex-col ${
              mobileSheetState === "collapsed"
                ? "h-14"
                : mobileSheetState === "half"
                ? "h-[54vh]"
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
              <div className="w-12 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full mb-1" />
              <div className="w-full px-4 flex items-center justify-between text-xs text-[var(--dg-text-secondary)]">
                <span className="font-bold text-[var(--dg-text)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-cyan-500" />
                  {activeTab === "journey" ? "Plan Safe Trip" : selectedZone?.name || "Road Details"}
                </span>
                <span className="text-[10px] text-[var(--dg-text-muted)]">
                  {mobileSheetState === "collapsed" ? "Tap to open" : "Tap to adjust height"}
                </span>
              </div>
            </div>

            {/* Scrollable Content inside Bottom Sheet */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-8">
              {/* Tab Selector on Mobile */}
              <div className="flex items-center gap-1 bg-[var(--dg-surface-input)] p-1 rounded-xl border border-[var(--dg-border)]">
                <button
                  onClick={() => setActiveTab("journey")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "journey"
                      ? "bg-[var(--dg-surface-elevated)] text-cyan-600 dark:text-cyan-400 border border-[var(--dg-border)] shadow-sm"
                      : "text-[var(--dg-text-muted)]"
                  }`}
                >
                  Trip Planning
                </button>
                <button
                  onClick={() => setActiveTab("zone")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "zone"
                      ? "bg-[var(--dg-surface-elevated)] text-cyan-600 dark:text-cyan-400 border border-[var(--dg-border)] shadow-sm"
                      : "text-[var(--dg-text-muted)]"
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
                  onStartPickOnMap={handleStartPickOnMap}
                  activePickingTarget={pickingTarget}
                  originPlace={originPlace}
                  destinationPlace={destinationPlace}
                  onChangeOrigin={setOriginPlace}
                  onChangeDestination={setDestinationPlace}
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
          <div className="hidden sm:flex absolute bottom-4 left-4 z-[400] bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] px-3.5 py-2 rounded-xl shadow-xl text-[var(--dg-text)] text-xs items-center gap-3 transition-colors">
            <span className="font-bold text-[10px] uppercase tracking-wider text-[var(--dg-text-muted)]">
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
          </main>
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
