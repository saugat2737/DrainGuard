"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, X, Loader2, Navigation2, Check } from "lucide-react";
import { GeocodePlace, TUMAKURU_FALLBACK_PRESETS } from "@/lib/geocoding";

interface PlaceAutocompleteInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: GeocodePlace | null;
  onChange: (place: GeocodePlace | null) => void;
  onPickOnMap?: () => void;
  accentColor?: "green" | "red" | "cyan";
  isPickingOnMap?: boolean;
}

export function PlaceAutocompleteInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  onPickOnMap,
  accentColor = "cyan",
  isPickingOnMap = false,
}: PlaceAutocompleteInputProps) {
  const [query, setQuery] = useState<string>(value ? value.name : "");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<GeocodePlace[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync displayed query if parent resets or updates value externally
  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else if (!isPickingOnMap) {
      setQuery("");
    }
  }, [value, isPickingOnMap]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      // Show default suggestions when query is very short
      const filtered = TUMAKURU_FALLBACK_PRESETS.filter((p) =>
        trimmed.length === 0 ? true : p.name.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 5);
      setResults(filtered);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}&limit=5`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.places) {
          setResults(json.data.places);
        } else if (Array.isArray(json.data)) {
          setResults(json.data);
        }
      }
    } catch (err: unknown) {
      if ((err as any)?.name !== "AbortError") {
        // Fallback to local suggestions
        const filtered = TUMAKURU_FALLBACK_PRESETS.filter((p) =>
          p.name.toLowerCase().includes(trimmed.toLowerCase())
        ).slice(0, 5);
        setResults(filtered);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setIsOpen(true);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchResults(text);
    }, 320); // 320ms debounce
  };

  const handleSelectPlace = (place: GeocodePlace) => {
    setQuery(place.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    onChange(place);
  };

  const handleClear = () => {
    setQuery("");
    onChange(null);
    setResults(TUMAKURU_FALLBACK_PRESETS.slice(0, 5));
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        fetchResults(query);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectPlace(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getPinColor = () => {
    if (accentColor === "green") return "bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.6)]";
    if (accentColor === "red") return "bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    return "bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.6)]";
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container */}
      <div
        className={`flex items-center gap-2 bg-[#0B1220] border ${
          isPickingOnMap
            ? "border-cyan-400 ring-2 ring-cyan-500/20"
            : isOpen
            ? "border-cyan-500/80"
            : "border-slate-800 focus-within:border-cyan-500/60"
        } p-2 rounded-xl transition duration-150`}
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getPinColor()}`} />

        <div className="flex-1 min-w-0">
          <label htmlFor={id} className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
            {label}
          </label>
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={`${id}-results`}
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(true);
              if (results.length === 0) fetchResults(query);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full bg-transparent text-white text-xs font-medium focus:outline-none placeholder:text-slate-500 truncate pt-0.5"
          />
        </div>

        {/* Input utility actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin mr-1" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              aria-label={`Clear ${label}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          {onPickOnMap && (
            <button
              type="button"
              onClick={onPickOnMap}
              title="Pick point directly on map"
              aria-label="Pick location directly on map"
              className={`p-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition ${
                isPickingOnMap
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
              }`}
            >
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Map</span>
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id={`${id}-results`}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-[600] bg-[#0E1726] border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {results.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> Searching places...
                </span>
              ) : (
                <span>No matching places found. Try another search or pick directly on the map.</span>
              )}
            </div>
          ) : (
            <ul className="py-1">
              <li className="px-3 py-1 text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800/60 bg-slate-900/40 flex justify-between">
                <span>{query.trim().length >= 2 ? "Search Results" : "Suggested Landmarks"}</span>
                <span className="font-normal lowercase text-slate-400">Photon / OSM</span>
              </li>

              {results.map((place, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li
                    key={place.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectPlace(place)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 cursor-pointer flex items-start gap-2.5 transition border-b border-slate-800/40 last:border-b-0 ${
                      isSelected ? "bg-cyan-500/15 text-white" : "text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${place.isLocalSuggestion ? "text-cyan-400" : "text-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white flex items-center justify-between">
                        <span className="truncate">{place.name}</span>
                        {place.isLocalSuggestion && (
                          <span className="text-[9px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/60 shrink-0 ml-1">
                            Local Landmark
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {place.displayName}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
