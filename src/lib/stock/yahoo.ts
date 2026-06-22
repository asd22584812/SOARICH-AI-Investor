import YahooFinance from "yahoo-finance2";
import type { Market } from "./types";
import {
  isTaiwanSearchQuery,
  searchTaiwanStockByNameOrCode,
  type TaiwanStockMatch,
} from "./twStockList";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

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

function toPercent(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
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
  return yahooFinance.quote(yahooSymbol);
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
  });
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
  const quote = await fetchYahooQuote(yahooSymbol).catch(() => null);
  const summary = await safeFetchYahooSummary(yahooSymbol);

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

  const sharesOutstanding = toNumber(
    summary?.defaultKeyStatistics?.sharesOutstanding
  );
  const totalFreeCashflow = toNumber(summary?.financialData?.freeCashflow);
  const freeCashFlowPerShare =
    sharesOutstanding && totalFreeCashflow != null
      ? totalFreeCashflow / sharesOutstanding
      : null;

  const displaySymbol = displaySymbolFromYahoo(
    quote?.symbol ?? yahooSymbol,
    market,
    normalized.displaySymbol
  );

  return {
    displaySymbol,
    yahooSymbol,
    name:
      quote?.shortName ??
      quote?.longName ??
      summary?.price?.shortName ??
      summary?.price?.longName ??
      displaySymbol,
    market,
    currency,
    currentPrice: price,
    change: toNumber(quote?.regularMarketChange),
    changePercent: toNumber(quote?.regularMarketChangePercent),
    eps:
      toNumber(quote?.epsTrailingTwelveMonths) ??
      toNumber(summary?.defaultKeyStatistics?.trailingEps),
    pe:
      toNumber(quote?.trailingPE) ??
      toNumber(summary?.summaryDetail?.trailingPE),
    pb:
      toNumber(quote?.priceToBook) ??
      toNumber(summary?.defaultKeyStatistics?.priceToBook),
    marketCap:
      toNumber(quote?.marketCap) ??
      toNumber(summary?.summaryDetail?.marketCap),
    revenueGrowth: toPercent(summary?.financialData?.revenueGrowth),
    roe: toPercent(summary?.financialData?.returnOnEquity),
    roa: toPercent(summary?.financialData?.returnOnAssets),
    bookValuePerShare: toNumber(summary?.defaultKeyStatistics?.bookValue),
    freeCashFlowPerShare,
    grossMargin: toPercent(summary?.financialData?.grossMargins),
    operatingMargin: toPercent(summary?.financialData?.operatingMargins),
    debtToEquity: toNumber(summary?.financialData?.debtToEquity),
    peg: toNumber(summary?.defaultKeyStatistics?.pegRatio),
    industry:
      (typeof summary?.assetProfile?.industryDisp === "string" &&
        summary.assetProfile.industryDisp) ||
      (typeof summary?.assetProfile?.sectorDisp === "string" &&
        summary.assetProfile.sectorDisp) ||
      null,
  };
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

async function resolveSnapshotFromCandidates(
  query: string,
  candidates: NormalizedTicker[]
): Promise<YahooStockSnapshot | null> {
  for (const normalized of candidates) {
    for (const yahooSymbol of normalized.yahooSymbols) {
      const snapshot = await tryBuildSnapshot(normalized, yahooSymbol);
      if (snapshot) return snapshot;
    }
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

  if (isTaiwanSearchQuery(trimmed)) {
    const matches = await searchTaiwanStockByNameOrCode(trimmed, 1);
    const best = matches[0];
    if (best) {
      const normalized = buildNormalizedFromTaiwanMatch(trimmed, best);
      const snapshot = await tryBuildSnapshot(normalized, best.yahooSymbol);
      if (snapshot) return snapshot;

      const alternateSuffix = best.yahooSuffix === ".TW" ? ".TWO" : ".TW";
      const alternateSymbol = `${best.symbol}${alternateSuffix}`;
      const alternateSnapshot = await tryBuildSnapshot(
        {
          ...normalized,
          yahooSymbols: [alternateSymbol],
        },
        alternateSymbol
      );
      if (alternateSnapshot) return alternateSnapshot;
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
