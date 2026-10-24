"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { useTheme, ThemePreference } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Light",
      icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
    },
    {
      value: "dark",
      label: "Dark",
      icon: <Moon className="w-3.5 h-3.5 text-cyan-400" />,
    },
    {
      value: "system",
      label: "System",
      icon: <Laptop className="w-3.5 h-3.5 text-slate-400" />,
    },
  ];

  return (
    <div ref={containerRef} className="relative inline-block text-left z-[850]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--dg-border)] bg-[var(--dg-surface-elevated)] hover:bg-[var(--dg-surface-hover)] text-xs font-medium text-[var(--dg-text)] transition shadow-sm touch-target"
        aria-label={`Select theme (current: ${theme}, resolved: ${resolvedTheme})`}
        aria-expanded={isOpen}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        )}
        <span className="hidden sm:inline capitalize">{theme}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-36 rounded-xl border border-[var(--dg-border)] bg-[var(--dg-surface-card)] backdrop-blur-md shadow-2xl p-1 z-[850] text-xs space-y-0.5 animate-in fade-in duration-100"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              role="menuitem"
              onClick={() => {
                setTheme(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                theme === opt.value
                  ? "bg-cyan-500/15 text-cyan-400 font-bold"
                  : "text-[var(--dg-text-secondary)] hover:bg-[var(--dg-surface-hover)] hover:text-[var(--dg-text)]"
              }`}
            >
              <div className="flex items-center gap-2">
                {opt.icon}
                <span>{opt.label}</span>
              </div>
              {theme === opt.value && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
