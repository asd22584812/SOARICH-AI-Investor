import type {
  HomeMarketFeed,
  Market,
  StockAnalysis,
} from "@/types/stock";

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: Market;
  yahooSymbol: string;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency?: "TWD" | "USD";
}

async function parseJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export async function fetchStockAnalysis(
  query: string
): Promise<StockAnalysis | null> {
  const response = await fetch(
    `/api/stocks/analyze?q=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );
  return parseJson<StockAnalysis>(response);
}

export async function searchStocksApi(
  query: string,
  market?: Market
): Promise<StockSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (market) params.set("market", market);

  const response = await fetch(`/api/stocks/search?${params.toString()}`, {
    cache: "no-store",
  });
  const data = await parseJson<StockSearchResult[]>(response);
  return data ?? [];
}

export async function fetchHomeMarketFeed(
  market: Market
): Promise<HomeMarketFeed> {
  const response = await fetch(`/api/stocks/recommendations?market=${market}`, {
    cache: "no-store",
  });
  const data = await parseJson<HomeMarketFeed>(response);
  return (
    data ?? {
      todayFocus: [],
      undervalued: [],
      highQuality: [],
      moat: [],
    }
  );
}

/** @deprecated Use fetchHomeMarketFeed */
export async function fetchRecommendations(market: Market) {
  const feed = await fetchHomeMarketFeed(market);
  return feed.undervalued;
}

export function toStockQuoteFromSearch(result: StockSearchResult): import("@/types/stock").StockQuote {
  return {
    symbol: result.symbol,
    name: result.name,
    market: result.market,
    price: result.price ?? 0,
    change: result.change ?? 0,
    changePercent: result.changePercent ?? 0,
    currency: result.currency ?? (result.market === "TW" ? "TWD" : "USD"),
  };
}

export async function warmTaiwanStockListCache(): Promise<void> {
  try {
    await fetch("/api/stocks/tw-list", { cache: "no-store" });
  } catch {
    // 預熱失敗不影響搜尋，API 會使用 memory / fallback
  }
}
