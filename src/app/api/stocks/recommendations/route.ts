import { NextRequest, NextResponse } from "next/server";
import type { HomeFeedResponse, Market } from "@/types/stock";
import { buildHomeMarketFeed } from "@/lib/stock/home-feed";
import {
  getAllStockAnalyses,
  getScanStatus,
} from "@/lib/db/market-db";

export const runtime = "nodejs";

const EMPTY_FEED: HomeFeedResponse["feed"] = {
  todayFocus: [],
  undervalued: [],
  highQuality: [],
  moat: [],
};

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") as Market | null;

  if (market !== "TW" && market !== "US") {
    return NextResponse.json({ error: "缺少或無效的 market 參數" }, { status: 400 });
  }

  const scan = getScanStatus(market);

  if (scan.scanning || !scan.hasData) {
    const response: HomeFeedResponse = {
      scanning: true,
      message: "正在更新市場資料",
      feed: EMPTY_FEED,
      sectionCounts: {
        todayFocus: 0,
        undervalued: 0,
        highQuality: 0,
        moat: 0,
      },
      lastScannedAt: scan.lastScannedAt,
    };
    return NextResponse.json(response);
  }

  const analyses = getAllStockAnalyses(market);
  const feed = buildHomeMarketFeed(analyses);

  const response: HomeFeedResponse = {
    scanning: false,
    feed,
    sectionCounts: {
      todayFocus: feed.todayFocus.length,
      undervalued: feed.undervalued.length,
      highQuality: feed.highQuality.length,
      moat: feed.moat.length,
    },
    lastScannedAt: scan.lastScannedAt,
  };

  return NextResponse.json(response);
}
