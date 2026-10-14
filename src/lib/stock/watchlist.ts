import type { StockAnalysis, WatchlistItem } from "@/types/stock";

export function toWatchlistItem(stock: StockAnalysis): WatchlistItem {
  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    currency: stock.currency,
    aiScore: stock.totalScore,
    entryLabel: stock.entryLabel,
    entrySignal: stock.entrySignal,
    sparkline: [], // Historical prices have not been fetched; never fabricate a trend.
  };
}
