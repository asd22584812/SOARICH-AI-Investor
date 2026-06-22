import fallbackTaiwanStocks from "@/data/fallbackTaiwanStocks.json";
import { resolveTwseIndustryName } from "./tw-industry-codes";

const TWSE_API_URL = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L";
const TPEX_API_URL = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const TW_STOCK_LIST_CACHE_KEY = "soarich-tw-stock-list-v1";

export type TaiwanExchange = "TWSE" | "TPEx";

export interface TaiwanStockRecord {
  symbol: string;
  name: string;
  shortName: string;
  industry: string;
  exchange: TaiwanExchange;
  yahooSuffix: ".TW" | ".TWO";
}

export interface TaiwanStockMatch extends TaiwanStockRecord {
  score: number;
  yahooSymbol: string;
}

interface CachePayload {
  stocks: TaiwanStockRecord[];
  fetchedAt: number;
}

let memoryCache: CachePayload | null = null;

/** 熱門快取（非主要資料源，用於精確名稱與同分排序） */
const HOT_NAME_TO_SYMBOL: Record<string, string> = {
  台積電: "2330",
  鴻海: "2317",
  聯發科: "2454",
};

const POPULAR_TW_SYMBOL_RANK: Record<string, number> = {
  "2330": 1,
  "2317": 2,
  "2454": 3,
  "2308": 4,
  "1301": 5,
  "2303": 6,
  "2881": 7,
  "2882": 8,
  "2412": 9,
  "2002": 10,
};

function popularRank(symbol: string): number {
  return POPULAR_TW_SYMBOL_RANK[symbol] ?? 999;
}

function cleanName(value: string): string {
  return value.replace(/\*/g, "").trim();
}

function isEquitySymbol(symbol: string): boolean {
  return /^\d{4}$/.test(symbol);
}

function toYahooSymbol(stock: TaiwanStockRecord): string {
  return `${stock.symbol}${stock.yahooSuffix}`;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

export function hasChineseCharacters(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}

export function isTaiwanSearchQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (hasChineseCharacters(trimmed)) return true;
  if (/^\d{4,5}$/.test(trimmed)) return true;
  if (/^\d{4,5}\.(TW|TWO)$/i.test(trimmed)) return true;
  return false;
}

function parseTwseRows(rows: Array<Record<string, string>>): TaiwanStockRecord[] {
  return rows
    .filter((row) => isEquitySymbol(String(row["公司代號"] ?? "")))
    .map((row) => ({
      symbol: String(row["公司代號"]),
      name: cleanName(String(row["公司名稱"] ?? "")),
      shortName: cleanName(String(row["公司簡稱"] || row["公司名稱"] || "")),
      industry: resolveTwseIndustryName(String(row["產業別"] ?? "")),
      exchange: "TWSE" as const,
      yahooSuffix: ".TW" as const,
    }));
}

function parseTpexRows(
  rows: Array<{ SecuritiesCompanyCode?: string; CompanyName?: string }>
): TaiwanStockRecord[] {
  const map = new Map<string, TaiwanStockRecord>();

  for (const row of rows) {
    const symbol = String(row.SecuritiesCompanyCode ?? "");
    if (!isEquitySymbol(symbol) || symbol.startsWith("00")) continue;

    map.set(symbol, {
      symbol,
      name: cleanName(String(row.CompanyName ?? symbol)),
      shortName: cleanName(String(row.CompanyName ?? symbol)),
      industry: "上櫃",
      exchange: "TPEx",
      yahooSuffix: ".TWO",
    });
  }

  return [...map.values()];
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 15000
): Promise<Response> {
  return fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function fetchTwseStocks(): Promise<TaiwanStockRecord[]> {
  const response = await fetchWithTimeout(TWSE_API_URL);
  if (!response.ok) {
    throw new Error(`TWSE API failed: ${response.status}`);
  }
  const rows = (await response.json()) as Array<Record<string, string>>;
  return parseTwseRows(rows);
}

export async function fetchTpexStocks(): Promise<TaiwanStockRecord[]> {
  const response = await fetchWithTimeout(TPEX_API_URL);
  if (!response.ok) {
    throw new Error(`TPEx API failed: ${response.status}`);
  }
  const rows = (await response.json()) as Array<{
    SecuritiesCompanyCode?: string;
    CompanyName?: string;
  }>;
  return parseTpexRows(rows);
}

function loadFallbackStocks(): TaiwanStockRecord[] {
  return (fallbackTaiwanStocks as TaiwanStockRecord[]).map((stock) => ({
    ...stock,
    name: cleanName(stock.name),
    shortName: cleanName(stock.shortName),
  }));
}

async function fetchAllTaiwanStocksFromApis(): Promise<TaiwanStockRecord[]> {
  const [twse, tpex] = await Promise.all([fetchTwseStocks(), fetchTpexStocks()]);
  const twseSymbols = new Set(twse.map((stock) => stock.symbol));
  const merged = [
    ...twse,
    ...tpex.filter((stock) => !twseSymbols.has(stock.symbol)),
  ];
  return merged.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function isCacheValid(cache: CachePayload | null): cache is CachePayload {
  return !!cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

export function getTaiwanStockListFromMemoryCache(): TaiwanStockRecord[] | null {
  return isCacheValid(memoryCache) ? memoryCache.stocks : null;
}

export function setTaiwanStockListMemoryCache(stocks: TaiwanStockRecord[]): void {
  memoryCache = { stocks, fetchedAt: Date.now() };
}

export function readTaiwanStockListClientCache():
  | TaiwanStockRecord[]
  | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TW_STOCK_LIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!isCacheValid(parsed)) return null;
    return parsed.stocks;
  } catch {
    return null;
  }
}

export function writeTaiwanStockListClientCache(stocks: TaiwanStockRecord[]): void {
  if (typeof window === "undefined") return;

  const payload: CachePayload = {
    stocks,
    fetchedAt: Date.now(),
  };
  window.localStorage.setItem(TW_STOCK_LIST_CACHE_KEY, JSON.stringify(payload));
}

export async function getAllTaiwanStocks(): Promise<TaiwanStockRecord[]> {
  if (isCacheValid(memoryCache)) {
    return memoryCache.stocks;
  }

  try {
    const stocks = await fetchAllTaiwanStocksFromApis();
    setTaiwanStockListMemoryCache(stocks);
    return stocks;
  } catch (error) {
    console.error("[twStockList] OpenAPI fetch failed, using fallback:", error);
    const fallback = loadFallbackStocks();
    setTaiwanStockListMemoryCache(fallback);
    return fallback;
  }
}

function scoreTaiwanStock(stock: TaiwanStockRecord, query: string): number {
  const q = normalizeSearchText(query);
  const symbol = stock.symbol.toLowerCase();
  const name = normalizeSearchText(stock.name);
  const shortName = normalizeSearchText(stock.shortName);
  const compactName = name.replace(/股份有限公司|有限公司/g, "");

  if (symbol === q) return 100;
  if (shortName === q) return 98;
  if (name === q || compactName === q) return 96;
  if (symbol.startsWith(q)) return 85;
  if (shortName.startsWith(q)) return 82;
  if (name.startsWith(q) || compactName.startsWith(q)) return 80;
  if (shortName.includes(q)) return 70;
  if (name.includes(q) || compactName.includes(q)) return 65;
  if (symbol.includes(q)) return 60;
  return 0;
}

export async function searchTaiwanStockByNameOrCode(
  query: string,
  limit = 8
): Promise<TaiwanStockMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const hotSymbol = HOT_NAME_TO_SYMBOL[trimmed];
  if (hotSymbol) {
    const stocks = await getAllTaiwanStocks();
    const hot = stocks.find((stock) => stock.symbol === hotSymbol);
    if (hot) {
      return [
        {
          ...hot,
          score: 99,
          yahooSymbol: toYahooSymbol(hot),
        },
      ];
    }
  }

  const stocks = await getAllTaiwanStocks();
  return stocks
    .map((stock) => ({
      ...stock,
      score: scoreTaiwanStock(stock, trimmed),
      yahooSymbol: toYahooSymbol(stock),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const rankDiff = popularRank(a.symbol) - popularRank(b.symbol);
      if (rankDiff !== 0) return rankDiff;
      return a.symbol.localeCompare(b.symbol);
    })
    .slice(0, limit);
}

export function getBestTaiwanStockMatch(
  matches: TaiwanStockMatch[]
): TaiwanStockMatch | null {
  return matches[0] ?? null;
}

export async function resolveTaiwanStockQuery(
  query: string
): Promise<TaiwanStockMatch | null> {
  const matches = await searchTaiwanStockByNameOrCode(query, 1);
  return getBestTaiwanStockMatch(matches);
}
