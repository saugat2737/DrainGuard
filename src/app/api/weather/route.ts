import { NextResponse } from "next/server";
import { getWeatherForecast } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getWeatherForecast();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      {
        data: {
          rain_mm_next_3h: 0,
          peak_hour: "N/A",
          source: "cache",
        },
      },
      { status: 200 }
    );
  }
}
