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

  if (!scan.hasData) {
    return NextResponse.json({
      scanning: scan.scanning,
      message: scan.scanning ? "正在更新市場資料" : "市場資料尚未就緒",
      items: [],
    });
  }

  const analyses = getPopularStocks(market, Number.isFinite(limit) ? Math.min(20, Math.max(1, Math.floor(limit))) : 20);
  return NextResponse.json({
    scanning: false,
    items: analyses.map(toWatchlistItem),
  });
}
