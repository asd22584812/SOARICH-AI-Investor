import type { Market } from "@/types/stock";
import type { UniverseSymbol } from "./universe";

/**
 * 優先掃描池：流動性高、跨產業，用來讓首頁在完整掃描完成前
 * 就能顯示有意義的低估／高品質排行。不是推薦名單，只是掃描順序。
 */
export const TW_PRIORITY_TICKERS = [
  "2330", "2317", "2454", "2308", "2382", "3711", "6669", "3034",
  "2303", "2881", "2882", "2891", "2886", "2884", "2885",
  "2412", "3045", "4904",
  "1301", "1303", "1326", "2002", "1101", "2603", "2609",
  "1216", "2912", "2207", "5871", "5876",
  "2327", "2379", "3037", "6488", "5274", "3443", "3661",
  "6505", "9910", "1476", "8454",
] as const;

export const US_PRIORITY_TICKERS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "AVGO", "TSLA",
  "JPM", "BAC", "WFC", "C", "GS", "MS", "BLK",
  "XOM", "CVX", "COP", "BRK-B",
  "JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY",
  "WMT", "COST", "HD", "PG", "KO", "PEP",
  "V", "MA", "DIS", "NFLX", "CRM", "ORCL", "AMD", "INTC",
  "CAT", "GE", "BA", "IBM", "QCOM", "TXN", "AMAT",
] as const;

export function getPriorityUniverse(market: Market): UniverseSymbol[] {
  const tickers =
    market === "TW" ? TW_PRIORITY_TICKERS : US_PRIORITY_TICKERS;
  return tickers.map((query) => ({ query, market }));
}

/** 優先股先掃，其餘接在後面並去重 */
export function prioritizeUniverse(
  market: Market,
  universe: UniverseSymbol[]
): UniverseSymbol[] {
  const priority = getPriorityUniverse(market);
  const seen = new Set(priority.map((item) => item.query.toUpperCase()));
  const rest = universe.filter(
    (item) => !seen.has(item.query.toUpperCase())
  );
  return [...priority, ...rest];
}
