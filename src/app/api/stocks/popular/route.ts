import { NextRequest, NextResponse } from "next/server";
import type { Market } from "@/types/stock";
import { getPopularStocks, getScanStatus } from "@/lib/db/market-db";
import { toWatchlistItem } from "@/lib/stock/watchlist";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") as Market | null;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");

  if (market !== "TW" && market !== "US") {
    return NextResponse.json({ error: "缺少或無效的 market 參數" }, { status: 400 });
  }

  const scan = getScanStatus(market);

  if (scan.scanning || !scan.hasData) {
    return NextResponse.json({
      scanning: true,
      message: "正在更新市場資料",
      items: [],
    });
  }

  const analyses = getPopularStocks(market, Math.min(20, Math.max(1, limit)));
  return NextResponse.json({
    scanning: false,
    items: analyses.map(toWatchlistItem),
  });
}
