import { refreshMarketBatch } from "@/lib/scanner/scanner";
import { getScanMeta } from "@/lib/db/market-db";
import { NextRequest, NextResponse } from "next/server";
import type { HomeFeedResponse, Market } from "@/types/stock";
import { buildHomeMarketFeed } from "@/lib/stock/home-feed";
import {
  getAllStockAnalyses,
  getScanStatus,
} from "@/lib/db/market-db";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  await refreshMarketBatch(market);
  const scan = getScanStatus(market);
  const pending = !getScanMeta(`cycle_completed_${market}`);

  if (!scan.hasData) {
    const response: HomeFeedResponse = {
      scanning: scan.scanning,
      message: scan.scanning ? "正在掃描市場資料" : scan.status === "failed" ? "市場資料取得失敗或資料不足，將稍後重試" : "市場資料尚未建立",
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
    scanning: scan.scanning || pending,
    message: scan.status === "failed" ? "部分市場資料更新失敗，先顯示最近已驗證的結果" : pending ? "市場資料分批更新中，先顯示已完成的結果" : undefined,
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
