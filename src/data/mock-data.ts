import type {
  AssetOverview,
  WatchlistItem,
} from "@/types/stock";
import { generateAssetHistory, generateSparkline } from "@/lib/chart-utils";

export const WATCHLIST_TICKERS = ["2330", "NVDA", "AAPL"] as const;

export const MOCK_ASSET_OVERVIEW: AssetOverview = {
  totalAssets: 1285320,
  dailyPnL: 12530,
  dailyPnLPercent: 1.25,
  currency: "TWD",
};

export function getAssetHistory7D() {
  return generateAssetHistory(MOCK_ASSET_OVERVIEW.totalAssets, 7, 42);
}

export function getAssetHistory30D() {
  return generateAssetHistory(MOCK_ASSET_OVERVIEW.totalAssets, 30, 17);
}

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
