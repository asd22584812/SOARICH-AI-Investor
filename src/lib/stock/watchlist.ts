import type { StockAnalysis, StockResearchReport, WatchlistItem } from "@/types/stock";

export function toWatchlistItem(stock: StockAnalysis | StockResearchReport): WatchlistItem {
  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    currency: stock.currency,
    changeAvailable: stock.changeAvailable,
    quoteAsOf: stock.quoteAsOf,
    aiScore: null,
    entryLabel: "待財報核對",
    entrySignal: "cautious",
    sparkline: [], // Historical prices have not been fetched; never fabricate a trend.
  };
}
