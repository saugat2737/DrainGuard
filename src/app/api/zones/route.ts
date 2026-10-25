import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import zonesData from "@/data/zones.seed.json";
import { getAllReportsAsync } from "@/lib/reports-store";
import { Zone, Report, ZoneRisk } from "@/lib/types";
import { calculateZoneRisk } from "@/lib/risk";
import { getWeatherForecast } from "@/lib/weather";

export const dynamic = "force-dynamic";

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

    let rainMm: number;
    if (rawRain !== undefined && rawRain.trim() !== "") {
      rainMm = Number(rawRain);
    } else {
      const weather = await getWeatherForecast();
      rainMm = weather.rain_mm_next_3h;
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

    // Calculate risk for each zone
    const zonesWithRisk: (Zone & { risk: ZoneRisk })[] = zones.map((zone) => {
      const zoneReports = reportsByZone.get(zone.id) || [];
      const risk = calculateZoneRisk(zone, rainMm, zoneReports);
      return {
        ...zone,
        risk,
      };
    });

    return NextResponse.json({
      data: {
        rain_mm: rainMm,
        zones: zonesWithRisk,
      },
    });
  } catch (error: any) {
    console.error("[/api/zones] Error processing zones risk:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "An unexpected error occurred while processing zones risk.",
        },
      },
      { status: 500 }
    );
  }
}
