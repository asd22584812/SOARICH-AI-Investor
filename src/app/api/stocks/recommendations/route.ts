import { toWatchlistItem } from "@/lib/stock/watchlist";
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

  const cursorValue = request.nextUrl.searchParams.get("cursor");
  const cursor = cursorValue == null ? undefined : Number(cursorValue);
  if (cursor != null && (!Number.isInteger(cursor) || cursor < 0 || cursor > 100000)) {
    return NextResponse.json({ error: "無效的掃描位置" }, { status: 400 });
  }
  await refreshMarketBatch(market, cursor);
  const progress = {
    nextCursor: Number(getScanMeta(`cursor_${market}`) ?? 0),
    universeCount: (JSON.parse(getScanMeta(`universe_${market}`) ?? "[]") as unknown[]).length,
  };
  const scan = getScanStatus(market);
  const directoryWarning = getScanMeta(`directory_warning_${market}`);
  const pending = !getScanMeta(`cycle_completed_${market}`);

  if (!scan.hasData) {
    const response: HomeFeedResponse = {
    ...progress,
      scanning: scan.scanning,
      message: scan.scanning ? "正在掃描市場資料" : scan.status === "failed" ? `市場更新失敗：${getScanMeta(`batch_error_${market}`) || "資料不足"}，將自動重試` : "市場資料尚未建立",
      feed: EMPTY_FEED,
      sectionCounts: {
        todayFocus: 0,
        undervalued: 0,
        highQuality: 0,
        moat: 0,
      },
      lastScannedAt: scan.lastScannedAt,
    };
    if (directoryWarning) response.message = `${response.message ?? "市場資料已更新"}。目前僅涵蓋可取得名單；${directoryWarning}`;
    return NextResponse.json(response);
  }

  const analyses = getAllStockAnalyses(market);
  const feed = buildHomeMarketFeed(analyses);

  const response: HomeFeedResponse = {
    ...progress,
    popular: analyses.slice().sort((a, b) => (b.financialProfile.marketCap ?? 0) - (a.financialProfile.marketCap ?? 0)).slice(0, 20).map(toWatchlistItem),
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

  if (directoryWarning) response.message = `${response.message ?? "市場資料已更新"}。目前僅涵蓋可取得名單；${directoryWarning}`;
    return NextResponse.json(response);
}
