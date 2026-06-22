import type { WatchlistItem } from "@/types/stock";
import { generateSparkline } from "@/lib/chart-utils";

export const WATCHLIST_TICKERS = ["2330", "NVDA", "AAPL"] as const;

export { toWatchlistItem } from "@/lib/stock/watchlist";

export function buildWatchlistFromAnalyses(
  analyses: import("@/types/stock").StockAnalysis[]
): WatchlistItem[] {
  return analyses.map((analysis) => ({
    symbol: analysis.symbol,
    name: analysis.name,
    market: analysis.market,
    price: analysis.price,
    change: analysis.change,
    changePercent: analysis.changePercent,
    currency: analysis.currency,
    aiScore: analysis.totalScore,
    buySignal: analysis.buySignal,
    sparkline: generateSparkline(
      analysis.symbol.charCodeAt(0) * 100,
      20,
      analysis.changePercent >= 0 ? "up" : "down"
    ),
  }));
}

export { analyzeStock, getStockAnalysisFromEngine } from "@/lib/stock/analyzer";
