import { NextRequest, NextResponse } from "next/server";
import type { HomeMarketFeed, HomeStockCard, Market } from "@/types/stock";
import {
  analyzeStockInput,
  toStockAnalysis,
} from "@/lib/stock/analyzer";
import { matchesMarketFilter } from "@/lib/stock/market-filter";
import {
  buildStockInputFromYahoo,
  snapshotToNullableMetrics,
} from "@/lib/stock/stock-input-builder";
import { searchStock } from "@/lib/stock/yahoo";

export const runtime = "nodejs";

const US_SCREEN_TICKERS = [
  "NVDA",
  "AAPL",
  "MSFT",
  "GOOGL",
  "TSLA",
  "AMD",
  "META",
  "AMZN",
];

const TW_SCREEN_TICKERS = [
  "2330",
  "2317",
  "2454",
  "2303",
  "2881",
  "2882",
  "2412",
  "1301",
  "2002",
  "2308",
  "2327",
];

async function analyzeTicker(ticker: string) {
  const snapshot = await searchStock(ticker);
  if (!snapshot?.normalized) return null;

  const stockInput = buildStockInputFromYahoo(snapshot);
  if (!stockInput) return null;

  const result = analyzeStockInput(stockInput);
  return toStockAnalysis(
    result,
    stockInput,
    snapshotToNullableMetrics(snapshot.normalized)
  );
}

function toHomeStockCard(analysis: NonNullable<Awaited<ReturnType<typeof analyzeTicker>>>): HomeStockCard {
  return {
    symbol: analysis.symbol,
    name: analysis.name,
    market: analysis.market,
    score: analysis.totalScore,
    entryLabel: analysis.entryLabel,
    entrySignal: analysis.entrySignal,
    price: analysis.price,
    fairPrice: analysis.valuation.fairPrice,
    undervaluedPercent: Math.max(
      0,
      Math.round(analysis.valuation.marginOfSafety)
    ),
    currency: analysis.currency,
  };
}

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") as Market | null;

  if (market !== "TW" && market !== "US") {
    return NextResponse.json({ error: "缺少或無效的 market 參數" }, { status: 400 });
  }

  const tickers = market === "TW" ? TW_SCREEN_TICKERS : US_SCREEN_TICKERS;

  try {
    const analyses = (
      await Promise.all(tickers.map((ticker) => analyzeTicker(ticker)))
    )
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((analysis) => matchesMarketFilter(analysis, market));

    const toSortedCards = (
      filterFn: (analysis: (typeof analyses)[number]) => boolean,
      sortFn: (
        a: (typeof analyses)[number],
        b: (typeof analyses)[number]
      ) => number
    ) =>
      analyses
        .filter(filterFn)
        .sort(sortFn)
        .slice(0, 5)
        .map(toHomeStockCard);

    const feed: HomeMarketFeed = {
      radar: toSortedCards(
        (analysis) => analysis.radarEligible,
        (a, b) => b.valuation.marginOfSafety - a.valuation.marginOfSafety
      ),
      undervalued: toSortedCards(
        (analysis) => analysis.undervaluedFocusEligible,
        (a, b) => b.valuation.marginOfSafety - a.valuation.marginOfSafety
      ),
      highQuality: toSortedCards(
        (analysis) => analysis.highQualityWatchEligible,
        (a, b) => b.totalScore - a.totalScore
      ),
    };

    return NextResponse.json(feed);
  } catch (error) {
    console.error("[api/stocks/recommendations]", error);
    return NextResponse.json(
      { error: "推薦資料載入失敗" },
      { status: 500 }
    );
  }
}
