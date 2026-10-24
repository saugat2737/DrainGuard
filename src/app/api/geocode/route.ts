import { NextRequest, NextResponse } from "next/server";
import { searchPlaces, reverseGeocode, getLocalSuggestions } from "@/lib/geocoding";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    // Reverse geocoding mode: /api/geocode?mode=reverse&lat=13.34&lng=77.12
    if (mode === "reverse") {
      const rawLat = searchParams.get("lat");
      const rawLng = searchParams.get("lng");
      if (!rawLat || !rawLng) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "lat and lng query parameters are required for reverse geocoding." } },
          { status: 400 }
        );
      }
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: { code: "INVALID_COORDINATES", message: "Invalid latitude or longitude." } },
          { status: 400 }
        );
      }

      const place = await reverseGeocode(lat, lng);
      return NextResponse.json({ data: place });
    }

    // Forward search mode: /api/geocode?q=railway+station
    const q = searchParams.get("q") ?? "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "5", 10), 1), 10);

    if (q.trim().length < 2) {
      const suggestions = getLocalSuggestions(q);
      return NextResponse.json({
        data: {
          places: suggestions.slice(0, limit),
          provider: "local_suggestions",
          cached: true,
        },
      });
    }

    const result = await searchPlaces(q, { limit });
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Geocoding failed";
    return NextResponse.json(
      { error: { code: "GEOCODE_ERROR", message } },
      { status: 500 }
    );
  }
}
