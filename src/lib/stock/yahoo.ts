import YahooFinance from "yahoo-finance2";
import type { Market } from "./types";
import {
  isTaiwanSearchQuery,
  getTaiwanStockListFromMemoryCache,
  searchTaiwanStockByNameOrCode,
  type TaiwanStockMatch,
} from "./twStockList";
import { applyCompanyClassification } from "./company-classification";
import {
  normalizeFinancials,
  type NormalizedFinancialData,
  type YahooQuoteLike,
  type YahooSummaryLike,
} from "./normalizer";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"], validation: { logErrors: false } });

export interface NormalizedTicker {
  query: string;
  displaySymbol: string;
  yahooSymbols: string[];
  market: Market;
}

export interface YahooStockSnapshot {
  displaySymbol: string;
  yahooSymbol: string;
  name: string;
  market: Market;
  currency: "TWD" | "USD";
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  eps: number | null;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  revenueGrowth: number | null;
  roe: number | null;
  roa: number | null;
  bookValuePerShare: number | null;
  freeCashFlowPerShare: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  debtToEquity: number | null;
  peg: number | null;
  industry: string | null;
  normalized: NormalizedFinancialData;
}

export interface YahooSearchResult {
  symbol: string;
  name: string;
  market: Market;
  yahooSymbol: string;
}

const SEARCHABLE_QUOTE_TYPES = new Set([
  "EQUITY",
  "ETF",
  "MUTUALFUND",
  "INDEX",
]);

function cleanQuery(query: string): string {
  return query.trim();
}

function isTaiwanNumericTicker(value: string): boolean {
  return /^\d{4,5}$/.test(value);
}

function extractTaiwanDigits(value: string): string | null {
  const twMatch = value.match(/^(\d{4,5})\.(TW|TWO)$/i);
  if (twMatch) return twMatch[1];
  if (isTaiwanNumericTicker(value)) return value;
  return null;
}

function buildTaiwanNormalized(query: string, digits: string): NormalizedTicker {
  return {
    query,
    displaySymbol: digits,
    yahooSymbols: [`${digits}.TW`, `${digits}.TWO`],
    market: "TW",
  };
}

function buildNormalizedFromTaiwanMatch(
  query: string,
  match: TaiwanStockMatch
): NormalizedTicker {
  return {
    query,
    displaySymbol: match.symbol,
    yahooSymbols: [match.yahooSymbol],
    market: "TW",
  };
}

export function normalizeTicker(query: string): NormalizedTicker | null {
  const trimmed = cleanQuery(query);
  if (!trimmed) return null;

  const twDigits = extractTaiwanDigits(trimmed.toUpperCase());
  if (twDigits) {
    if (/\.(TW|TWO)$/i.test(trimmed)) return { query: trimmed, displaySymbol: twDigits, yahooSymbols: [trimmed.toUpperCase()], market: "TW" };
    return buildTaiwanNormalized(trimmed, twDigits);
  }

  const upper = trimmed.toUpperCase();
  return {
    query: trimmed,
    displaySymbol: upper.replace(/\.(TW|TWO)$/i, ""),
    yahooSymbols: [upper],
    market: /\.(TW|TWO)$/i.test(upper) ? "TW" : "US",
  };
}

function mapNormalizedToSnapshot(
  data: NormalizedFinancialData
): YahooStockSnapshot {
  return {
    displaySymbol: data.displaySymbol,
    yahooSymbol: data.yahooSymbol,
    name: data.name,
    market: data.market,
    currency: data.currency,
    currentPrice: data.currentPrice,
    change: data.change,
    changePercent: data.changePercent,
    eps: data.eps,
    pe: data.pe.value,
    pb: data.pb.value,
    marketCap: data.marketCap,
    revenueGrowth: data.revenueGrowth,
    roe: data.roe,
    roa: data.roa,
    bookValuePerShare: data.bookValuePerShare,
    freeCashFlowPerShare: data.freeCashFlowPerShare,
    grossMargin: data.grossMargin,
    operatingMargin: data.operatingMargin,
    debtToEquity: data.debtToEquity,
    peg: data.peg.value,
    industry: data.industry ?? data.sector,
    normalized: data,
  };
}

async function resolveTwDisplayName(
  symbol: string,
  fallbackName: string
): Promise<string> {
  try {
    const best = getTaiwanStockListFromMemoryCache()?.find((item) => item.symbol === symbol);
    if (best) return best.shortName || best.name;
  } catch {
    // ignore
  }
  return fallbackName;
}

async function resolveTwIndustry(symbol: string): Promise<string | null> {
  try {
    const best = getTaiwanStockListFromMemoryCache()?.find((item) => item.symbol === symbol);
    return best?.industry ?? null;
  } catch {
    return null;
  }
}

export function inferMarketFromSymbol(
  yahooSymbol: string,
  currency?: string
): Market {
  if (/\.(TW|TWO)$/i.test(yahooSymbol)) return "TW";
  if (currency === "TWD") return "TW";
  return "US";
}

function inferCurrency(market: Market, currency?: string): "TWD" | "USD" {
  if (currency === "TWD" || market === "TW") return "TWD";
  return "USD";
}

function displaySymbolFromYahoo(
  yahooSymbol: string,
  market: Market,
  fallback: string
): string {
  if (market === "TW") {
    return yahooSymbol.replace(/\.(TW|TWO)$/i, "");
  }
  return yahooSymbol.replace(/\.(TW|TWO)$/i, "") || fallback;
}

export async function fetchYahooQuote(yahooSymbol: string) {
  return yahooFinance.quote(yahooSymbol, {}, { fetchOptions: { signal: AbortSignal.timeout(20000) } });
}

export async function fetchYahooSummary(yahooSymbol: string) {
  return yahooFinance.quoteSummary(yahooSymbol, {
    modules: [
      "price",
      "summaryDetail",
      "financialData",
      "defaultKeyStatistics",
      "assetProfile",
    ],
  }, { fetchOptions: { signal: AbortSignal.timeout(20000) } });
}

async function safeFetchYahooSummary(yahooSymbol: string) {
  try {
    return await fetchYahooSummary(yahooSymbol);
  } catch {
    return null;
  }
}

async function buildSnapshotFromYahoo(
  normalized: NormalizedTicker,
  yahooSymbol: string
): Promise<YahooStockSnapshot | null> {
  const [quote, summary] = await Promise.all([
    fetchYahooQuote(yahooSymbol).catch(() => null), safeFetchYahooSummary(yahooSymbol),
  ]);

  const price =
    quote?.regularMarketPrice ?? summary?.price?.regularMarketPrice ?? null;
  if (price == null || !Number.isFinite(price)) {
    return null;
  }

  const market = inferMarketFromSymbol(
    yahooSymbol,
    quote?.currency ?? summary?.price?.currency
  );
  const currency = inferCurrency(
    market,
    quote?.currency ?? summary?.price?.currency
  );

  const displaySymbol = displaySymbolFromYahoo(
    quote?.symbol ?? yahooSymbol,
    market,
    normalized.displaySymbol
  );

  const rawName =
    quote?.shortName ??
    quote?.longName ??
    summary?.price?.shortName ??
    summary?.price?.longName ??
    displaySymbol;

  const resolvedName =
    market === "TW"
      ? await resolveTwDisplayName(displaySymbol, rawName)
      : rawName;

  const normalizedFinancials = applyCompanyClassification(
    await (async () => {
      const base = normalizeFinancials({
        quote: quote as YahooQuoteLike,
        summary: summary as YahooSummaryLike,
        displaySymbol,
        yahooSymbol,
        market,
        currency,
        name: resolvedName,
      });
      if (market !== "TW") return base;
      const twIndustry = await resolveTwIndustry(displaySymbol);
      return twIndustry ? { ...base, industry: twIndustry } : base;
    })()
  );

  return mapNormalizedToSnapshot(normalizedFinancials);
}

async function tryBuildSnapshot(
  normalized: NormalizedTicker,
  yahooSymbol: string
): Promise<YahooStockSnapshot | null> {
  try {
    return await buildSnapshotFromYahoo(normalized, yahooSymbol);
  } catch {
    return null;
  }
}

function isSearchableQuote(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const quote = item as {
    symbol?: string;
    quoteType?: string;
    shortname?: string;
    longname?: string;
  };
  if (!quote.symbol) return false;
  if (!quote.shortname && !quote.longname) return false;
  if (!quote.quoteType) return true;
  return SEARCHABLE_QUOTE_TYPES.has(quote.quoteType);
}

async function findSymbolsViaYahooSearch(
  query: string,
  limit = 8
): Promise<string[]> {
  try {
    const results = await yahooFinance.search(query, { quotesCount: 20 });
    return (results.quotes ?? [])
      .filter(isSearchableQuote)
      .map((item) => String((item as { symbol: string }).symbol))
      .slice(0, limit);
  } catch {
    return [];
  }
}

function normalizedFromYahooSymbol(
  query: string,
  yahooSymbol: string
): NormalizedTicker {
  const market = inferMarketFromSymbol(yahooSymbol);
  return {
    query,
    displaySymbol: displaySymbolFromYahoo(yahooSymbol, market, yahooSymbol),
    yahooSymbols: [yahooSymbol],
    market,
  };
}

function isAcceptableTaiwanSnapshot(
  snapshot: YahooStockSnapshot,
  normalized: NormalizedTicker
): boolean {
  if (normalized.market !== "TW") return true;
  if (snapshot.market !== "TW") return false;
  if (snapshot.currency !== "TWD") return false;
  if (!/\.(TW|TWO)$/i.test(snapshot.yahooSymbol)) return false;
  if (snapshot.displaySymbol !== normalized.displaySymbol) return false;
  return true;
}

async function resolveSnapshotFromCandidates(
  query: string,
  candidates: NormalizedTicker[]
): Promise<YahooStockSnapshot | null> {
  for (const normalized of candidates) {
    for (const yahooSymbol of normalized.yahooSymbols) {
      const snapshot = await tryBuildSnapshot(normalized, yahooSymbol);
      if (snapshot && isAcceptableTaiwanSnapshot(snapshot, normalized)) {
        return snapshot;
      }
    }
  }

  const isTwQuery =
    candidates.some((candidate) => candidate.market === "TW") ||
    isTaiwanSearchQuery(query);
  if (isTwQuery) {
    return null;
  }

  const searchedSymbols = await findSymbolsViaYahooSearch(query, 5);
  for (const yahooSymbol of searchedSymbols) {
    const normalized = normalizedFromYahooSymbol(query, yahooSymbol);
    const snapshot = await tryBuildSnapshot(normalized, yahooSymbol);
    if (snapshot) return snapshot;
  }

  return null;
}

export async function searchStock(query: string): Promise<YahooStockSnapshot | null> {
  const trimmed = cleanQuery(query);
  if (!trimmed) return null;

  if (isTaiwanSearchQuery(trimmed) && !/\.(TW|TWO)$/i.test(trimmed)) {
    const matches = await searchTaiwanStockByNameOrCode(trimmed, 1).catch(() => []);
    const best = matches[0];
    if (best) {
      const normalized = buildNormalizedFromTaiwanMatch(trimmed, best);
      const snapshot = await tryBuildSnapshot(normalized, best.yahooSymbol);
      if (snapshot && isAcceptableTaiwanSnapshot(snapshot, normalized)) {
        return snapshot;
      }

      const alternateSuffix = best.yahooSuffix === ".TW" ? ".TWO" : ".TW";
      const alternateSymbol = `${best.symbol}${alternateSuffix}`;
      const alternateSnapshot = await tryBuildSnapshot(
        {
          ...normalized,
          yahooSymbols: [alternateSymbol],
        },
        alternateSymbol
      );
      if (
        alternateSnapshot &&
        isAcceptableTaiwanSnapshot(alternateSnapshot, {
          ...normalized,
          yahooSymbols: [alternateSymbol],
        })
      ) {
        return alternateSnapshot;
      }
    }
  }

  const normalized = normalizeTicker(trimmed);
  const candidates = normalized ? [normalized] : [];

  return resolveSnapshotFromCandidates(trimmed, candidates);
}

function taiwanMatchToSearchResult(match: TaiwanStockMatch): YahooSearchResult {
  return {
    symbol: match.symbol,
    name: match.shortName || match.name,
    market: "TW",
    yahooSymbol: match.yahooSymbol,
  };
}

export async function searchYahooSymbols(
  query: string,
  market?: Market
): Promise<YahooSearchResult[]> {
  const trimmed = cleanQuery(query);
  if (!trimmed) return [];

  if (isTaiwanSearchQuery(trimmed) && (!market || market === "TW")) {
    const twMatches = await searchTaiwanStockByNameOrCode(trimmed, 8);
    if (twMatches.length > 0) {
      return twMatches.map(taiwanMatchToSearchResult);
    }
  }

  const normalized = normalizeTicker(trimmed);
  const directResults: YahooSearchResult[] = [];

  if (normalized) {
    for (const yahooSymbol of normalized.yahooSymbols) {
      try {
        const quote = await fetchYahooQuote(yahooSymbol);
        if (quote?.regularMarketPrice == null) continue;

        const resolvedMarket = inferMarketFromSymbol(
          yahooSymbol,
          quote.currency
        );
        if (market && resolvedMarket !== market) continue;

        directResults.push({
          symbol: displaySymbolFromYahoo(
            quote.symbol ?? yahooSymbol,
            resolvedMarket,
            normalized.displaySymbol
          ),
          name:
            quote.shortName ?? quote.longName ?? normalized.displaySymbol,
          market: resolvedMarket,
          yahooSymbol,
        });
        break;
      } catch {
        continue;
      }
    }
  }

  if (directResults.length > 0) {
    return directResults;
  }

  try {
    const searchedSymbols = await findSymbolsViaYahooSearch(trimmed, 12);
    return searchedSymbols
      .map((yahooSymbol) => {
        const resolvedMarket = inferMarketFromSymbol(yahooSymbol);
        return {
          symbol: displaySymbolFromYahoo(yahooSymbol, resolvedMarket, yahooSymbol),
          name: yahooSymbol,
          market: resolvedMarket,
          yahooSymbol,
        };
      })
      .filter((item) => !market || item.market === market)
      .slice(0, 8);
  } catch {
    return [];
  }
}

export async function fetchExactStock(yahooSymbol: string): Promise<YahooStockSnapshot | null> {
  const normalized = normalizedFromYahooSymbol(yahooSymbol, yahooSymbol);
  const snapshot = await tryBuildSnapshot(normalized, yahooSymbol);
  return snapshot?.yahooSymbol === yahooSymbol && snapshot.displaySymbol === normalized.displaySymbol ? snapshot : null;
}

// Yahoo occasionally adds fields before the library schema catches up.
// Validate the small public contract ourselves; never accept missing prices or foreign markets.
let usCandidatesCache: { until: number; promise: Promise<unknown> } | undefined;

/** 常見 ADR／非美股本國公司（首頁初篩排除，避免外幣財報干擾 USD 估價） */
function looksLikeAdrSymbol(symbol: string, name: string): boolean {
  if (/[.-]/.test(symbol)) return true;
  // 已知大量出現在 Yahoo「低估大型股」的非美 ADR
  if (
    /^(BBD|ITUB|BSBR|LYG|UMC|NIO|BABA|JD|PDD|BIDU|TSM|SONY|TM|HMC|SAP|ASML|SHOP|SE|MELI|PBR|INTR|VALE|ABEV|EQNR|BP|SHEL|RIO|BHP|UL|DEO|GSK|AZN|NVO|SNY)$/i.test(
      symbol
    )
  ) {
    return true;
  }
  return /\b(S\.A\.|SAADR|ADR|PLC|N\.V\.|Corp\.?\s*ADR|Brazilian|Brasil|British|Canada|Toronto)\b/i.test(
    name
  );
}

function isUsExchange(exchange: unknown): boolean {
  const ex = String(exchange ?? "").toUpperCase();
  return (
    ex.includes("NMS") ||
    ex.includes("NYQ") ||
    ex.includes("NGM") ||
    ex.includes("NCM") ||
    ex.includes("NYSE") ||
    ex.includes("NASDAQ") ||
    ex.includes("PCX") ||
    ex.includes("ASE") ||
    ex === "NMS" ||
    ex === "NYQ"
  );
}

async function fetchScreenerQuotes(scrId: string, count: number): Promise<unknown[]> {
  try {
    const raw = (await yahooFinance.screener(
      { scrIds: scrId as "undervalued_large_caps", count, region: "US", lang: "en-US" },
      undefined,
      { validateResult: false, fetchOptions: { signal: AbortSignal.timeout(20000) } }
    )) as { quotes?: unknown[] };
    return Array.isArray(raw.quotes) ? raw.quotes : [];
  } catch {
    return [];
  }
}

/**
 * 課程門檻候選：直接對流動性高的美股報價做 PE／PB／殖利率過濾。
 * （yahoo-finance2 的 screener 自訂 query 會 InvalidOptionsError，不能再用。）
 */
const US_COURSE_SCAN_TICKERS = [
  // 金融／保險
  "JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TFC", "KEY", "CFG", "MTB",
  // 能源／原物料
  "XOM", "CVX", "COP", "OXY", "MPC", "PSX", "VLO", "DVN", "FANG", "EOG",
  // 電信／公用
  "VZ", "T", "TMUS", "DUK", "SO", "NEE", "EXC", "AEP",
  // 醫療／消費防禦
  "PFE", "MRK", "BMY", "ABBV", "JNJ", "CVS", "WBA", "PG", "KO", "PEP", "MO", "PM",
  // 科技／工業價值區
  "INTC", "IBM", "CSCO", "ORCL", "HPQ", "DELL", "MU", "AMAT", "CAT", "DE", "GE", "BA",
  // 零售／汽車
  "WMT", "TGT", "HD", "LOW", "F", "GM",
] as const;

async function fetchCourseGateQuotes(): Promise<unknown[]> {
  try {
    const raw = await yahooFinance.quote(
      [...US_COURSE_SCAN_TICKERS],
      {},
      { fetchOptions: { signal: AbortSignal.timeout(25000) } }
    );
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return rows.filter((row) => {
      if (!row || typeof row !== "object") return false;
      return meetsCoursePrefilter(row as Record<string, unknown>);
    });
  } catch {
    return [];
  }
}

function meetsCoursePrefilter(r: Record<string, unknown>): boolean {
  const pe =
    (typeof r.trailingPE === "number" ? r.trailingPE : null) ??
    (typeof r.forwardPE === "number" ? r.forwardPE : null);
  const pb = typeof r.priceToBook === "number" ? r.priceToBook : null;
  const dyRaw =
    (typeof r.dividendYield === "number" ? r.dividendYield : null) ??
    (typeof r.trailingAnnualDividendYield === "number"
      ? r.trailingAnnualDividendYield
      : null);
  const yieldPct = dyRaw == null ? null : dyRaw > 1 ? dyRaw / 100 : dyRaw;
  return (
    (pe != null && pe > 0 && pe <= 12) ||
    (pb != null && pb > 0 && pb <= 0.8) ||
    (yieldPct != null && yieldPct >= 0.04)
  );
}

/**
 * 美股動態初篩：
 * 1) 優先課程門檻自訂篩選（PE&lt;12 / PB&lt;0.8 / 殖利率&gt;4%）
 * 2) 再合併 Yahoo 預設低估篩選
 * 3) 排除明顯 ADR，只留 USD
 */
export async function fetchDynamicUsCandidates(): Promise<{ quotes: unknown[] }> {
  if (usCandidatesCache && usCandidatesCache.until > Date.now()) {
    return usCandidatesCache.promise as Promise<{ quotes: unknown[] }>;
  }
  const promise = (async () => {
    // 預設篩選器可用；自訂 query 會失敗，改用報價掃描補齊課程門檻
    const batches = await Promise.all([
      fetchCourseGateQuotes(),
      fetchScreenerQuotes("undervalued_large_caps", 40),
      fetchScreenerQuotes("undervalued_growth_stocks", 40),
      fetchScreenerQuotes("most_actives", 30),
      fetchScreenerQuotes("day_losers", 25),
    ]);
    const seen = new Set<string>();
    const courseHits: unknown[] = [];
    const otherUs: unknown[] = [];

    for (const row of batches.flat()) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const symbol = typeof r.symbol === "string" ? r.symbol.toUpperCase() : "";
      if (!symbol || seen.has(symbol)) continue;
      if (r.quoteType !== "EQUITY" || r.currency !== "USD") continue;
      if (!(typeof r.regularMarketPrice === "number" && r.regularMarketPrice > 0)) continue;
      const name = String(r.shortName ?? r.longName ?? "");
      if (looksLikeAdrSymbol(symbol, name)) continue;
      // 只要明確是美股交易所，或來自課程掃描池
      const exchangeOk = isUsExchange(r.fullExchangeName ?? r.exchange);
      if (!exchangeOk && !US_COURSE_SCAN_TICKERS.includes(symbol as (typeof US_COURSE_SCAN_TICKERS)[number])) {
        continue;
      }
      seen.add(symbol);
      if (meetsCoursePrefilter(r)) courseHits.push(row);
      else otherUs.push(row);
    }

    // 課程門檻命中的排最前面，首頁前幾批才找得到低估股
    return { quotes: [...courseHits, ...otherUs].slice(0, 100) };
  })();

  usCandidatesCache = { until: Date.now() + 300000, promise };
  try {
    return await promise;
  } catch (error) {
    usCandidatesCache = undefined;
    throw error;
  }
}

export async function fetchStatementSeries(symbol: string, type: 'annual' | 'quarterly') {
  return yahooFinance.fundamentalsTimeSeries(symbol, {
    period1: new Date(Date.now() - 6 * 366 * 86400000), type, module: 'all',
  }, { fetchOptions: { signal: AbortSignal.timeout(18000) } });
}
