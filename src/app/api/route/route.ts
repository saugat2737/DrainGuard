import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import zonesData from "@/data/zones.seed.json";
import { getAllReports } from "@/lib/reports-store";
import { Zone } from "@/lib/types";
import { calculateZoneRisk } from "@/lib/risk";
import { getWeatherForecast } from "@/lib/weather";
import {
  fetchOSRMAlternatives,
  scoreRoute,
  compareRoutes,
  ScoredRoute,
} from "@/lib/routing";

export const dynamic = "force-dynamic";

const routeQuerySchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  rain_mm: z.number().min(0).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = routeQuerySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parseResult.error.issues?.[0]?.message || "Invalid origin, destination, or rain parameter.",
          },
        },
        { status: 400 }
      );
    }

    const { origin, destination, rain_mm } = parseResult.data;

    let effectiveRain = rain_mm;
    if (effectiveRain === undefined) {
      const weather = await getWeatherForecast();
      effectiveRain = weather.rain_mm_next_3h;
    }

    // Prepare current zones with risk scores
    const zones = zonesData.zones as unknown as Zone[];
    const reports = getAllReports();
    const reportsByZone = new Map();
    for (const report of reports) {
      if (report.zone_id) {
        const list = reportsByZone.get(report.zone_id) || [];
        list.push(report);
        reportsByZone.set(report.zone_id, list);
      }
    }

    const zonesWithRisk = zones.map((zone) => {
      const zoneReports = reportsByZone.get(zone.id) || [];
      return {
        ...zone,
        risk: calculateZoneRisk(zone, effectiveRain!, zoneReports),
      };
    });

    // Attempt to fetch actual OSRM alternatives
    let osrmRoutes;
    try {
      osrmRoutes = await fetchOSRMAlternatives(origin, destination);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "ROUTING_UNAVAILABLE",
            message: "Unable to retrieve navigable driving routes from OSRM. Please check your network or try again.",
          },
        },
        { status: 503 }
      );
    }

    // Score each returned candidate route
    const scoredCandidates: ScoredRoute[] = osrmRoutes.map((r) =>
      scoreRoute(r.coordinates, r.duration, r.distance, zonesWithRisk)
    );

    const comparison = compareRoutes(scoredCandidates);

    return NextResponse.json({
      data: comparison,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during route computation.",
        },
      },
      { status: 500 }
    );
  }
}
