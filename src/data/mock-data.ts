import type { WatchlistItem } from "@/types/stock";
import { generateSparkline } from "@/lib/chart-utils";

export const TW_WATCHLIST_TICKERS = ["2330", "2454", "2317", "2881"] as const;
export const US_WATCHLIST_TICKERS = ["NVDA", "AAPL", "MSFT", "META"] as const;

/** @deprecated Use market-specific watchlist tickers */
export const WATCHLIST_TICKERS = [...TW_WATCHLIST_TICKERS, ...US_WATCHLIST_TICKERS] as const;

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
    entryLabel: analysis.entryLabel,
    entrySignal: analysis.entrySignal,
    sparkline: generateSparkline(
      analysis.symbol.charCodeAt(0) * 100,
      20,
      analysis.changePercent >= 0 ? "up" : "down"
    ),
  }));
}

export { analyzeStock, getStockAnalysisFromEngine } from "@/lib/stock/analyzer";
