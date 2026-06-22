import { NextRequest, NextResponse } from "next/server";
import type { Market } from "@/types/stock";
import {
  analyzeStockInput,
  toStockAnalysis,
} from "@/lib/stock/analyzer";
import { isHomeRecommendation } from "@/lib/stock/signal";
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

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") as Market | null;

  if (market !== "TW" && market !== "US") {
    return NextResponse.json({ error: "缺少或無效的 market 參數" }, { status: 400 });
  }

  const tickers = market === "TW" ? TW_SCREEN_TICKERS : US_SCREEN_TICKERS;

  try {
    const analyses = (
      await Promise.all(tickers.map((ticker) => analyzeTicker(ticker)))
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    const recommendations = analyses
      .filter((analysis) =>
        isHomeRecommendation(
          analysis.totalScore,
          analysis.totalScore > 0 && analysis.financialProfile.score > 0
        )
      )
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5)
      .map((analysis) => ({
        symbol: analysis.symbol,
        name: analysis.name,
        market: analysis.market,
        score: analysis.totalScore,
        buySignal: analysis.buySignal,
        price: analysis.price,
        fairPrice: analysis.valuation.fairPrice,
        undervaluedPercent: Math.max(
          0,
          Math.round(analysis.valuation.marginOfSafety)
        ),
        currency: analysis.currency,
      }));

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("[api/stocks/recommendations]", error);
    return NextResponse.json(
      { error: "推薦資料載入失敗" },
      { status: 500 }
    );
  }
}
