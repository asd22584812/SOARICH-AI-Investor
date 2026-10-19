import type {
  HomeFeedResponse,
  Market,
  StockResearchReport,
  WatchlistItem,
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
): Promise<StockResearchReport | null> {
  const response = await fetch(
    `/api/stocks/analyze?q=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );
  return parseJson<StockResearchReport>(response);
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
  market: Market, cursor?: number, signal?: AbortSignal
): Promise<HomeFeedResponse> {
  const response = await fetch(`/api/stocks/recommendations?market=${market}&cursor=${cursor??0}`, {cache:'no-store',signal});
  if(!response.ok) throw new Error(`市場服務回應 ${response.status}`);
  const data=await response.json() as HomeFeedResponse;
  if(!data.researchRadar || data.assessmentStatus==='source_error') throw new Error(data.message??'市場來源資料不完整');
  return data;
}

export async function fetchPopularStocks(
  market: Market,
  limit = 20
): Promise<{ scanning: boolean; message?: string; items: WatchlistItem[] }> {
  const response = await fetch(
    `/api/stocks/popular?market=${market}&limit=${limit}`,
    { cache: "no-store" }
  );
  const data = await parseJson<{
    scanning: boolean;
    message?: string;
    items: WatchlistItem[];
  }>(response);
  return data ?? { scanning: false, message: "市場資料讀取失敗，請稍後重試", items: [] };
}

/** @deprecated Use fetchHomeMarketFeed */
export async function fetchRecommendations(market: Market) {
  const result = await fetchHomeMarketFeed(market);
  return result.feed.undervalued;
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
