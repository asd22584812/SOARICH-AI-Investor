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
    todayFocus: "估值研究候選",
    undervalued: `${prefix}低於保守估值`,
    highQuality: `${prefix}品質與合理價觀察`,
    moat: `${prefix}成長改善觀察`,
    watchlist: `${prefix}股票觀察`,
  };
}
