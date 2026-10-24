import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllReports, addReport, findNearestZone } from "@/lib/reports-store";
import zonesData from "@/data/zones.seed.json";
import { Zone, Report, BlockageType, ReportSeverity } from "@/lib/types";
import { calculateZoneRisk } from "@/lib/risk";
import { getWeatherForecast } from "@/lib/weather";

export const dynamic = "force-dynamic";

const createReportSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photo_url: z.string().nullable().optional(),
  blockage_type: z.enum([
    "plastic",
    "silt",
    "debris",
    "construction",
    "none",
    "unknown",
  ]),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  summary: z.string().min(1).max(250),
});

export async function GET() {
  try {
    const reports = getAllReports();
    return NextResponse.json({
      data: reports,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve blockage reports.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = createReportSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parseResult.error.issues?.[0]?.message || "Invalid report payload.",
          },
        },
        { status: 400 }
      );
    }

    const { lat, lng, photo_url, blockage_type, severity, summary } = parseResult.data;
    const zones = zonesData.zones as unknown as Zone[];

    // Spatial nearest-zone lookup (200m radius threshold)
    const { zone: matchedZone, distanceMeters } = findNearestZone(lat, lng, zones, 200);

    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newReport: Report = {
      id: reportId,
      lat,
      lng,
      zone_id: matchedZone ? matchedZone.id : null,
      photo_url: photo_url || null,
      blockage_type: blockage_type as BlockageType,
      severity: severity as ReportSeverity,
      summary,
      status: "open",
      source: "citizen",
      created_at: new Date().toISOString(),
    };

    addReport(newReport);

    // Compute updated zone risk if report matched a zone
    let updatedZoneRisk = null;
    if (matchedZone) {
      const weather = await getWeatherForecast();
      const allReports = getAllReports();
      const zoneReports = allReports.filter((r) => r.zone_id === matchedZone.id);
      updatedZoneRisk = calculateZoneRisk(matchedZone, weather.rain_mm_next_3h, zoneReports);
    }

    return NextResponse.json({
      data: {
        report: newReport,
        matched_zone_id: matchedZone ? matchedZone.id : null,
        distance_meters: Math.round(distanceMeters),
        updated_zone_risk: updatedZoneRisk,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit blockage report.",
        },
      },
      { status: 500 }
    );
  }
}
