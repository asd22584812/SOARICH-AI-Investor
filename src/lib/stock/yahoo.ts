import YahooFinance from "yahoo-finance2";
import type { Market } from "./types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** 台股中文名稱 → 代號（可擴充） */
export const TW_NAME_TO_TICKER: Record<string, string> = {
  台積電: "2330",
  鴻海: "2317",
  聯發科: "2454",
  台塑: "1301",
  中鋼: "2002",
  聯電: "2303",
  富邦金: "2881",
  國泰金: "2882",
  中華電: "2412",
};

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

export function normalizeTicker(query: string): NormalizedTicker | null {
  const trimmed = cleanQuery(query);
  if (!trimmed) return null;

  const chineseName = TW_NAME_TO_TICKER[trimmed];
  if (chineseName) {
    return buildTaiwanNormalized(trimmed, chineseName);
  }

  const twDigits = extractTaiwanDigits(trimmed.toUpperCase());
  if (twDigits) {
    return buildTaiwanNormalized(trimmed, twDigits);
  }

  const upper = trimmed.toUpperCase();
  return {
    query: trimmed,
    displaySymbol: upper,
    yahooSymbols: [upper],
    market: "US",
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

function inferMarketFromSymbol(
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

async function buildSnapshotFromYahoo(
  normalized: NormalizedTicker,
  yahooSymbol: string
): Promise<YahooStockSnapshot | null> {
  const [quote, summary] = await Promise.all([
    fetchYahooQuote(yahooSymbol),
    fetchYahooSummary(yahooSymbol),
  ]);

  const price = quote?.regularMarketPrice ?? summary.price?.regularMarketPrice;
  if (price == null || !Number.isFinite(price)) {
    return null;
  }

  const market = inferMarketFromSymbol(
    yahooSymbol,
    quote?.currency ?? summary.price?.currency
  );
  const currency = inferCurrency(market, quote?.currency ?? summary.price?.currency);

  const sharesOutstanding = toNumber(summary.defaultKeyStatistics?.sharesOutstanding);
  const totalFreeCashflow = toNumber(summary.financialData?.freeCashflow);
  const freeCashFlowPerShare =
    sharesOutstanding && totalFreeCashflow != null
      ? totalFreeCashflow / sharesOutstanding
      : null;

  const displaySymbol =
    market === "TW"
      ? normalized.displaySymbol
      : (quote?.symbol ?? normalized.displaySymbol).replace(/\.(TW|TWO)$/i, "");

  return {
    displaySymbol,
    yahooSymbol,
    name:
      quote?.shortName ??
      quote?.longName ??
      summary.price?.shortName ??
      summary.price?.longName ??
      displaySymbol,
    market,
    currency,
    currentPrice: price,
    change: toNumber(quote?.regularMarketChange),
    changePercent: toNumber(quote?.regularMarketChangePercent),
    eps:
      toNumber(quote?.epsTrailingTwelveMonths) ??
      toNumber(summary.defaultKeyStatistics?.trailingEps),
    pe:
      toNumber(quote?.trailingPE) ??
      toNumber(summary.summaryDetail?.trailingPE),
    pb:
      toNumber(quote?.priceToBook) ??
      toNumber(summary.defaultKeyStatistics?.priceToBook),
    marketCap:
      toNumber(quote?.marketCap) ??
      toNumber(summary.summaryDetail?.marketCap),
    revenueGrowth: toPercent(summary.financialData?.revenueGrowth),
    roe: toPercent(summary.financialData?.returnOnEquity),
    roa: toPercent(summary.financialData?.returnOnAssets),
    bookValuePerShare: toNumber(summary.defaultKeyStatistics?.bookValue),
    freeCashFlowPerShare,
    grossMargin: toPercent(summary.financialData?.grossMargins),
    operatingMargin: toPercent(summary.financialData?.operatingMargins),
    debtToEquity: toNumber(summary.financialData?.debtToEquity),
    peg: toNumber(summary.defaultKeyStatistics?.pegRatio),
    industry:
      (typeof summary.assetProfile?.industryDisp === "string" &&
        summary.assetProfile.industryDisp) ||
      (typeof summary.assetProfile?.sectorDisp === "string" &&
        summary.assetProfile.sectorDisp) ||
      null,
  };
}

export async function searchStock(query: string): Promise<YahooStockSnapshot | null> {
  const normalized = normalizeTicker(query);
  if (!normalized) return null;

  for (const yahooSymbol of normalized.yahooSymbols) {
    try {
      const snapshot = await buildSnapshotFromYahoo(normalized, yahooSymbol);
      if (snapshot) return snapshot;
    } catch {
      continue;
    }
  }

  return null;
}

export interface YahooSearchResult {
  symbol: string;
  name: string;
  market: Market;
  yahooSymbol: string;
}

export async function searchYahooSymbols(
  query: string,
  market?: Market
): Promise<YahooSearchResult[]> {
  const trimmed = cleanQuery(query);
  if (!trimmed) return [];

  const normalized = normalizeTicker(trimmed);
  if (normalized) {
    for (const yahooSymbol of normalized.yahooSymbols) {
      try {
        const quote = await fetchYahooQuote(yahooSymbol);
        if (quote?.regularMarketPrice != null) {
          const resolvedMarket = inferMarketFromSymbol(
            yahooSymbol,
            quote.currency
          );
          if (market && resolvedMarket !== market) continue;

          return [
            {
              symbol:
                resolvedMarket === "TW"
                  ? normalized.displaySymbol
                  : (quote.symbol ?? normalized.displaySymbol),
              name: quote.shortName ?? quote.longName ?? normalized.displaySymbol,
              market: resolvedMarket,
              yahooSymbol,
            },
          ];
        }
      } catch {
        continue;
      }
    }
  }

  try {
    const results = await yahooFinance.search(trimmed, { quotesCount: 8 });
    return (results.quotes ?? [])
      .filter((item) => item.symbol && (item.shortname || item.longname))
      .map((item) => {
        const yahooSymbol = String(item.symbol);
        const resolvedMarket = inferMarketFromSymbol(
          yahooSymbol,
          typeof item.exchDisp === "string" ? item.exchDisp : undefined
        );
        const name =
          (typeof item.shortname === "string" && item.shortname) ||
          (typeof item.longname === "string" && item.longname) ||
          yahooSymbol;
        return {
          symbol: yahooSymbol.replace(/\.(TW|TWO)$/i, ""),
          name,
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
