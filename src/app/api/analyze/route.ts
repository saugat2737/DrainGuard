import { NextRequest, NextResponse } from "next/server";
import { analyzeDrainImage } from "@/lib/vision";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!photo || !(photo instanceof Blob)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_FILE",
            message: "A valid photo file (JPEG, PNG, or WebP) under 5 MB is required.",
          },
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(photo.type)) {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Unsupported file format. Only JPEG, PNG, and WebP images are permitted.",
          },
        },
        { status: 400 }
      );
    }

    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            code: "FILE_TOO_LARGE",
            message: "Uploaded image exceeds the 5 MB limit.",
          },
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await analyzeDrainImage(buffer, photo.type);

    return NextResponse.json({
      data: result,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during photo analysis.",
        },
      },
      { status: 500 }
    );
  }
}
