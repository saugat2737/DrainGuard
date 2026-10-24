"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, MapPin, X, Loader2 } from "lucide-react";
import { GeocodePlace, TUMAKURU_FALLBACK_PRESETS } from "@/lib/geocoding";

interface MapSearchBarProps {
  onSelectPlace: (place: GeocodePlace, action?: "fly" | "set_origin" | "set_dest") => void;
}

export function MapSearchBar({ onSelectPlace }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeocodePlace[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = async (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setResults(TUMAKURU_FALLBACK_PRESETS.slice(0, 5));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}&limit=5`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data?.places || []);
      }
    } catch {
      setResults(
        TUMAKURU_FALLBACK_PRESETS.filter((p) =>
          p.name.toLowerCase().includes(trimmed.toLowerCase())
        ).slice(0, 5)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 320);
  };

  const handleSelect = (place: GeocodePlace, action: "fly" | "set_origin" | "set_dest" = "fly") => {
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace(place, action);
  };

  const handleClear = () => {
    setQuery("");
    setResults(TUMAKURU_FALLBACK_PRESETS.slice(0, 5));
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] rounded-2xl px-3 py-2 shadow-xl focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition">
        <Search className="w-4 h-4 text-cyan-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            setIsOpen(true);
            if (results.length === 0) search(query);
          }}
          placeholder="Search places or coordinates in Tumakuru..."
          className="flex-1 bg-transparent text-xs text-[var(--dg-text)] placeholder:text-[var(--dg-text-muted)] focus:outline-none"
        />
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
        ) : query ? (
          <button
            onClick={handleClear}
            className="p-1 text-[var(--dg-text-muted)] hover:text-[var(--dg-text)] rounded"
            aria-label="Clear map search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[650] bg-[var(--dg-surface-card)] backdrop-blur-md border border-[var(--dg-border)] rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--dg-text-muted)]">
              No matching places found. Try another landmark.
            </div>
          ) : (
            <ul className="py-1">
              <li className="px-3.5 py-1.5 text-[9px] uppercase tracking-wider text-[var(--dg-text-muted)] font-bold border-b border-[var(--dg-border-subtle)] bg-[var(--dg-surface-muted)] flex justify-between">
                <span>{query.trim().length >= 2 ? "Search Results" : "Common Destinations"}</span>
                <span className="font-normal lowercase">Photon Open-Data</span>
              </li>
              {results.map((place) => (
                <li
                  key={place.id}
                  className="px-3.5 py-2.5 hover:bg-[var(--dg-surface-hover)] border-b border-[var(--dg-border-subtle)] last:border-b-0 transition flex items-start gap-2.5 group cursor-pointer"
                  onClick={() => handleSelect(place, "fly")}
                >
                  <MapPin className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--dg-text)] truncate flex items-center justify-between">
                      <span>{place.name}</span>
                      {place.isLocalSuggestion && (
                        <span className="text-[9px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0 ml-1">
                          Key Landmark
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--dg-text-secondary)] truncate mt-0.5">
                      {place.displayName}
                    </div>

                    {/* Quick navigation actions */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(place, "set_origin");
                        }}
                        className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded transition"
                      >
                        Set as Origin
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(place, "set_dest");
                        }}
                        className="text-[9px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded transition"
                      >
                        Set as Destination
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
