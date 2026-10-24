import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0B1220]/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-3">
        {/* Official Brand SVG Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/assets/drainguard-logo-dark.svg"
            alt="DrainGuard"
            width={140}
            height={28}
            className="h-7 w-auto object-contain hidden sm:block"
            priority
          />
          <Image
            src="/assets/drainguard-icon.svg"
            alt="DrainGuard"
            width={28}
            height={28}
            className="h-7 w-auto object-contain sm:hidden"
            priority
          />
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 ml-1">
            Simulated demo data
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/about"
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#142235] hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition"
        >
          <span>Methodology</span>
        </Link>

        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142235] border border-slate-700/60 text-xs text-slate-300 shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Tumakuru (13.3392°N, 77.1140°E)</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[#34D399] text-xs">
          <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
          <span className="font-semibold tracking-wide uppercase text-[10px]">Model Active</span>
        </div>
      </div>
    </header>
  );
}
