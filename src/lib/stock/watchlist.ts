import type { StockAnalysis, WatchlistItem } from "@/types/stock";
import { generateSparkline } from "@/lib/chart-utils";

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
    sparkline: generateSparkline(
      stock.symbol.charCodeAt(0) * 100,
      20,
      stock.changePercent >= 0 ? "up" : "down"
    ),
  };
}
