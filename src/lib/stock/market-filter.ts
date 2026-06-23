import type { Market } from "@/types/stock";

export type MarketFilter = "TW" | "US";

export function isTaiwanTicker(symbol: string): boolean {
  return /\.(TW|TWO)$/i.test(symbol);
}

export function matchesMarketFilter(
  item: { market: Market; symbol: string },
  filter: MarketFilter
): boolean {
  if (filter === "TW") {
    return item.market === "TW" || isTaiwanTicker(item.symbol);
  }
  return item.market === "US" && !isTaiwanTicker(item.symbol);
}

export function getHomeSectionLabels(filter: MarketFilter) {
  const prefix = filter === "TW" ? "台股" : "美股";
  return {
    todayFocus: "今日關注",
    radar: `${prefix}雷達`,
    undervalued: `${prefix}低估關注`,
    highQuality: `${prefix}高品質觀察`,
    watchlist: "自選股",
  };
}
