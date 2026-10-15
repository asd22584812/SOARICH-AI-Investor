import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market");
  if (market !== "TW" && market !== "US") return NextResponse.json({ error: "缺少或無效的 market 參數" }, { status: 400 });
  // Cached legacy scores are not verified research or a measure of popularity.
  return NextResponse.json({ scanning: false, assessmentStatus: "data_unverified", message: "股票觀察名單尚未完成資料核對", items: [] }, { headers: { "Cache-Control": "no-store" } });
}
