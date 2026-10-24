import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateReportStatus } from "@/lib/reports-store";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "assigned", "cleared"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = patchSchema.safeParse(body);

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
    const updated = updateReportStatus(id, status);

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
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update report status.",
        },
      },
      { status: 500 }
    );
  }
}
