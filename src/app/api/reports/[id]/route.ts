import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateReportStatus, getRepository } from "@/lib/reports-store";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["open", "assigned", "cleared"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repo = getRepository();
    if (process.env.NODE_ENV === "production" && !repo.isPersistent() && process.env.ALLOW_IN_MEMORY_STORAGE === "false") {
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

    const reportId = params?.id;
    if (!reportId || reportId.trim() === "") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Report id in path is required.",
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parseResult = patchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Valid status ('open', 'assigned', 'cleared') is required.",
          },
        },
        { status: 400 }
      );
    }

    const { status } = parseResult.data;
    const updated = await updateReportStatus(reportId, status);

    if (!updated) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Report with id '${reportId}' not found.`,
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
