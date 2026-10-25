import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import zonesData from "@/data/zones.seed.json";
import { getAllReportsAsync } from "@/lib/reports-store";
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
  first_high_hour: string | null;
  act_by: string | null;
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
    const reports = await getAllReportsAsync();

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

      // Priority 6: 12-hour timeline evaluation for clearance planning (CLEARANCE_BUFFER_HOURS = 2)
      let first_high_hour: string | null = null;
      let act_by: string | null = null;

      if (weather.timeline && weather.timeline.length > 0) {
        for (let i = 0; i < weather.timeline.length; i++) {
          const item = weather.timeline[i];
          const hourlyRisk = calculateZoneRisk(zone, item.rain_mm, zoneReports);
          if (hourlyRisk.score >= 60) {
            const highTime = new Date(item.time);
            if (!isNaN(highTime.getTime())) {
              first_high_hour = highTime.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
              const actByDate = new Date(highTime.getTime() - 2 * 60 * 60 * 1000);
              act_by = actByDate.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
            } else {
              first_high_hour = item.time;
              act_by = item.time;
            }
            break;
          }
        }
      }

      return {
        zone_id: zone.id,
        name: zone.name,
        score: currentRisk.score,
        level: currentRisk.level,
        score_at_forecast_peak: peakRisk.score,
        open_reports: openReportsCount,
        top_reason,
        first_high_hour,
        act_by,
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
