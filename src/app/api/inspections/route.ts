import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import zonesData from "@/data/zones.seed.json";
import { getAllReports } from "@/lib/reports-store";
import { Zone, Report, RiskLevel } from "@/lib/types";
import { calculateZoneRisk } from "@/lib/risk";
import { getWeatherForecast } from "@/lib/weather";

export const dynamic = "force-dynamic";

export interface InspectionQueueItem {
  zone_id: string;
  name: string;
  score: number;
  level: RiskLevel;
  score_at_forecast_peak: number;
  open_reports: number;
  top_reason: string;
}

const rainQuerySchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (val === undefined || val.trim() === "") return true;
      const num = Number(val);
      return !isNaN(num) && Number.isFinite(num) && num >= 0 && num <= 120;
    },
    {
      message: "rain_mm must be a valid number between 0 and 120",
    }
  );

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawRain = searchParams.get("rain_mm") ?? undefined;

    const parseResult = rainQuerySchema.safeParse(rawRain);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues?.[0]?.message ||
        "rain_mm must be a valid number between 0 and 120";
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: errorMessage,
          },
        },
        { status: 400 }
      );
    }

    // Always fetch weather to know forecast rain
    const weather = await getWeatherForecast();
    const forecastRain = weather.rain_mm_next_3h;

    let currentRainMm: number;
    if (rawRain !== undefined && rawRain.trim() !== "") {
      currentRainMm = Number(rawRain);
    } else {
      currentRainMm = forecastRain;
    }

    const zones = zonesData.zones as unknown as Zone[];
    const reports = getAllReports();

    // Group reports by zone_id
    const reportsByZone = new Map<string, Report[]>();
    for (const report of reports) {
      if (report.zone_id) {
        const list = reportsByZone.get(report.zone_id) || [];
        list.push(report);
        reportsByZone.set(report.zone_id, list);
      }
    }

    const queue: InspectionQueueItem[] = zones.map((zone) => {
      const zoneReports = reportsByZone.get(zone.id) || [];
      // Calculate current risk score (uses supplied rain or forecast)
      const currentRisk = calculateZoneRisk(zone, currentRainMm, zoneReports);
      // Calculate score at forecast peak (independent of manual simulation override)
      const peakRisk = calculateZoneRisk(zone, forecastRain, zoneReports);

      // Count only reports with status === "open"
      const openReportsCount = zoneReports.filter((r) => r.status === "open").length;

      // Extract top reason from factors (highest contribution) or fallback
      const topFactor = [...currentRisk.factors].sort(
        (a, b) => b.contribution - a.contribution
      )[0];
      const top_reason = topFactor && topFactor.contribution > 0
        ? topFactor.text
        : "Low baseline vulnerability";

      return {
        zone_id: zone.id,
        name: zone.name,
        score: currentRisk.score,
        level: currentRisk.level,
        score_at_forecast_peak: peakRisk.score,
        open_reports: openReportsCount,
        top_reason,
      };
    });

    // Deterministic sort: score DESC -> open_reports DESC -> zone_id ASC
    queue.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.open_reports !== a.open_reports) {
        return b.open_reports - a.open_reports;
      }
      return a.zone_id.localeCompare(b.zone_id);
    });

    return NextResponse.json({
      data: queue,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while generating the inspection queue.",
        },
      },
      { status: 500 }
    );
  }
}
