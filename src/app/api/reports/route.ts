import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllReportsAsync, addReport, findNearestZone, updateReportStatus, getRepository } from "@/lib/reports-store";
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

const patchReportSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "assigned", "cleared"]),
});

export async function GET() {
  try {
    const reports = await getAllReportsAsync();
    return NextResponse.json({
      data: reports,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: "STORAGE_ERROR",
          message: err?.message || "Failed to retrieve blockage reports from database.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const repo = getRepository();
    // In strict production mode without database credentials, return HTTP 503
    if (process.env.NODE_ENV === "production" && !repo.isPersistent() && process.env.ALLOW_IN_MEMORY_STORAGE === "false") {
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Persistent storage is unconfigured. Report cannot be durably recorded in production.",
          },
        },
        { status: 503 }
      );
    }

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

    if (!matchedZone) {
      return NextResponse.json(
        {
          error: {
            code: "LOCATION_OUT_OF_RANGE",
            message: `Report location (${lat.toFixed(4)}, ${lng.toFixed(4)}) is ${Math.round(distanceMeters)}m away from any eligible street zone, exceeding the 200m threshold.`,
          },
        },
        { status: 400 }
      );
    }

    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newReport: Report = {
      id: reportId,
      lat,
      lng,
      zone_id: matchedZone.id,
      photo_url: photo_url || null,
      blockage_type: blockage_type as BlockageType,
      severity: severity as ReportSeverity,
      summary,
      status: "open",
      source: "citizen",
      created_at: new Date().toISOString(),
    };

    const saved = await addReport(newReport);

    // Compute updated zone risk
    const weather = await getWeatherForecast();
    const allReports = await getAllReportsAsync();
    const zoneReports = allReports.filter((r) => r.zone_id === matchedZone.id);
    const updatedZoneRisk = calculateZoneRisk(matchedZone, weather.rain_mm_next_3h, zoneReports);

    return NextResponse.json(
      {
        data: {
          report: saved,
          matched_zone_id: matchedZone.id,
          distance_meters: Math.round(distanceMeters),
          updated_zone_risk: updatedZoneRisk,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    const isUnavailable = err?.message?.includes("PERSISTENT_STORAGE_UNAVAILABLE");
    return NextResponse.json(
      {
        error: {
          code: isUnavailable ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR",
          message: err?.message || "Failed to submit blockage report.",
        },
      },
      { status: isUnavailable ? 503 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const repo = getRepository();
    if (process.env.NODE_ENV === "production" && !repo.isPersistent() && process.env.ALLOW_IN_MEMORY_STORAGE !== "true") {
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Persistent storage is unconfigured. Status change cannot be saved in production.",
          },
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = patchReportSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Report id and valid status ('open', 'assigned', 'cleared') are required.",
          },
        },
        { status: 400 }
      );
    }

    const { id, status } = parseResult.data;
    const updated = await updateReportStatus(id, status);

    if (!updated) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Report with id '${id}' not found.`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: updated,
    });
  } catch (err: any) {
    const isUnavailable = err?.message?.includes("PERSISTENT_STORAGE_UNAVAILABLE");
    return NextResponse.json(
      {
        error: {
          code: isUnavailable ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR",
          message: err?.message || "Failed to update report status.",
        },
      },
      { status: isUnavailable ? 503 : 500 }
    );
  }
}
