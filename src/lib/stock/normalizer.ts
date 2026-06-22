import type { Market } from "./types";

export type CompanyClassification =
  | "growth"
  | "quality_compounder"
  | "value"
  | "financial"
  | "cyclical"
  | "insufficient_data";

export type FcfPerShareSource =
  | "reported"
  | "operating_cashflow"
  | "eps_estimate"
  | "missing";

export interface NormalizedRatio {
  value: number | null;
  unreliable: boolean;
  highRisk?: boolean;
}

export interface NormalizedDebtToEquity {
  value: number | null;
  uncertain: boolean;
  raw: number | null;
}

export interface ClassificationScores {
  growthScore: number;
  qualityScore: number;
  valueScore: number;
  financialScore: number;
  cyclicalScore: number;
}

export interface NormalizedFinancialData {
  displaySymbol: string;
  yahooSymbol: string;
  name: string;
  market: Market;
  currency: "TWD" | "USD";
  sector: string | null;
  industry: string | null;
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  eps: number | null;
  forwardEps: number | null;
  bookValuePerShare: number | null;
  freeCashFlowPerShare: number | null;
  operatingCashFlowPerShare: number | null;
  revenuePerShare: number | null;
  pe: NormalizedRatio;
  pb: NormalizedRatio;
  peg: NormalizedRatio;
  priceToSales: NormalizedRatio;
  evToEbitda: NormalizedRatio;
  currentRatio: NormalizedRatio;
  quickRatio: NormalizedRatio;
  roe: number | null;
  roa: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  fcfGrowth: number | null;
  debtToEquity: number | null;
  rawDebtToEquity: number | null;
  debtToEquityUncertain: boolean;
  marketCap: number | null;
  sharesOutstanding: number | null;
  fcfPerShareSource: FcfPerShareSource;
  insufficientData: boolean;
  missingCriticalFields: string[];
  companyClassification: CompanyClassification;
  classificationScores?: ClassificationScores;
  classificationReasons?: string[];
}

const CRITICAL_FIELDS = [
  "currentPrice",
  "eps",
  "pe",
  "pb",
  "freeCashFlowPerShare",
  "revenueGrowth",
  "roe",
  "operatingMargin",
] as const;

type CriticalField = (typeof CRITICAL_FIELDS)[number];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function normalizePercentField(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric == null) return null;
  if (Math.abs(numeric) <= 5) return numeric * 100;
  return numeric;
}

export function normalizeRatioField(
  value: unknown,
  options: { max?: number } = {}
): NormalizedRatio {
  const max = options.max ?? 500;
  const numeric = toFiniteNumber(value);
  if (numeric == null || numeric <= 0) {
    return { value: null, unreliable: false };
  }
  if (numeric > max) {
    return { value: null, unreliable: true };
  }
  return { value: numeric, unreliable: false };
}

export function normalizeDebtToEquity(value: unknown): NormalizedDebtToEquity {
  const raw = toFiniteNumber(value);
  if (raw == null || raw <= 0) {
    return { value: null, uncertain: false, raw };
  }
  if (raw > 100) {
    return { value: raw / 100, uncertain: false, raw };
  }
  if (raw > 20) {
    return { value: raw / 100, uncertain: false, raw };
  }
  if (raw > 5) {
    return { value: raw / 100, uncertain: true, raw };
  }
  return { value: raw, uncertain: false, raw };
}

function resolveFcfPerShare(input: {
  reportedFcfPerShare: number | null;
  totalFreeCashflow: number | null;
  operatingCashflow: number | null;
  sharesOutstanding: number | null;
  eps: number | null;
}): { value: number | null; source: FcfPerShareSource } {
  if (
    input.reportedFcfPerShare != null &&
    Number.isFinite(input.reportedFcfPerShare)
  ) {
    return { value: input.reportedFcfPerShare, source: "reported" };
  }

  if (input.sharesOutstanding != null && input.sharesOutstanding > 0) {
    if (input.totalFreeCashflow != null) {
      return {
        value: input.totalFreeCashflow / input.sharesOutstanding,
        source: "reported",
      };
    }
    if (input.operatingCashflow != null) {
      return {
        value: input.operatingCashflow / input.sharesOutstanding,
        source: "operating_cashflow",
      };
    }
  }

  if (input.eps != null && input.eps > 0) {
    return { value: input.eps * 0.75, source: "eps_estimate" };
  }

  return { value: null, source: "missing" };
}

export function validateFinancialData(
  data: Pick<
    NormalizedFinancialData,
    | "currentPrice"
    | "eps"
    | "pe"
    | "pb"
    | "freeCashFlowPerShare"
    | "revenueGrowth"
    | "roe"
    | "operatingMargin"
  >
): { insufficientData: boolean; missingCriticalFields: CriticalField[] } {
  const missingCriticalFields: CriticalField[] = [];

  if (data.currentPrice == null || data.currentPrice <= 0) {
    missingCriticalFields.push("currentPrice");
  }
  if (data.eps == null) missingCriticalFields.push("eps");
  if (data.pe.value == null) missingCriticalFields.push("pe");
  if (data.pb.value == null) missingCriticalFields.push("pb");
  if (data.freeCashFlowPerShare == null) {
    missingCriticalFields.push("freeCashFlowPerShare");
  }
  if (data.revenueGrowth == null) missingCriticalFields.push("revenueGrowth");
  if (data.roe == null) missingCriticalFields.push("roe");
  if (data.operatingMargin == null) missingCriticalFields.push("operatingMargin");

  return {
    insufficientData: missingCriticalFields.length >= 3,
    missingCriticalFields,
  };
}

export type YahooQuoteLike = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  epsTrailingTwelveMonths?: number;
  trailingPE?: number;
  priceToBook?: number;
  marketCap?: number;
};

export type YahooSummaryLike = {
  price?: {
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
    currency?: string;
  };
  summaryDetail?: {
    trailingPE?: number;
    marketCap?: number;
  };
  defaultKeyStatistics?: {
    trailingEps?: number;
    forwardEps?: number;
    bookValue?: number;
    sharesOutstanding?: number;
    pegRatio?: number;
    priceToBook?: number;
    priceToSalesTrailing12Months?: number;
    enterpriseToEbitda?: number;
  };
  financialData?: {
    freeCashflow?: number;
    operatingCashflow?: number;
    totalRevenue?: number;
    returnOnEquity?: number;
    returnOnAssets?: number;
    grossMargins?: number;
    operatingMargins?: number;
    profitMargins?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    freeCashflowGrowth?: number;
    debtToEquity?: number;
    currentRatio?: number;
    quickRatio?: number;
  };
  assetProfile?: {
    sectorDisp?: string;
    industryDisp?: string;
  };
};

export function normalizeYahooQuote(quote: YahooQuoteLike | null | undefined) {
  return {
    symbol: quote?.symbol ?? null,
    name: quote?.shortName ?? quote?.longName ?? null,
    currency: quote?.currency ?? null,
    currentPrice: toFiniteNumber(quote?.regularMarketPrice),
    change: toFiniteNumber(quote?.regularMarketChange),
    changePercent: toFiniteNumber(quote?.regularMarketChangePercent),
    eps: toFiniteNumber(quote?.epsTrailingTwelveMonths),
    pe: normalizeRatioField(quote?.trailingPE, { max: 150 }),
    pb: normalizeRatioField(quote?.priceToBook),
    marketCap: toFiniteNumber(quote?.marketCap),
  };
}

export function normalizeYahooSummary(
  summary: YahooSummaryLike | null | undefined
) {
  const sharesOutstanding = toFiniteNumber(
    summary?.defaultKeyStatistics?.sharesOutstanding
  );
  const totalRevenue = toFiniteNumber(summary?.financialData?.totalRevenue);
  const revenuePerShare =
    sharesOutstanding != null &&
    sharesOutstanding > 0 &&
    totalRevenue != null
      ? totalRevenue / sharesOutstanding
      : null;

  const fcfResolved = resolveFcfPerShare({
    reportedFcfPerShare: null,
    totalFreeCashflow: toFiniteNumber(summary?.financialData?.freeCashflow),
    operatingCashflow: toFiniteNumber(summary?.financialData?.operatingCashflow),
    sharesOutstanding,
    eps:
      toFiniteNumber(summary?.defaultKeyStatistics?.trailingEps) ??
      toFiniteNumber(summary?.defaultKeyStatistics?.forwardEps),
  });

  const debtNormalized = normalizeDebtToEquity(summary?.financialData?.debtToEquity);

  return {
    name:
      summary?.price?.shortName ??
      summary?.price?.longName ??
      null,
    currentPrice: toFiniteNumber(summary?.price?.regularMarketPrice),
    currency: summary?.price?.currency ?? null,
    sector: summary?.assetProfile?.sectorDisp ?? null,
    industry: summary?.assetProfile?.industryDisp ?? null,
    eps:
      toFiniteNumber(summary?.defaultKeyStatistics?.trailingEps) ??
      toFiniteNumber(summary?.defaultKeyStatistics?.forwardEps),
    forwardEps: toFiniteNumber(summary?.defaultKeyStatistics?.forwardEps),
    bookValuePerShare: toFiniteNumber(summary?.defaultKeyStatistics?.bookValue),
    freeCashFlowPerShare: fcfResolved.value,
    operatingCashFlowPerShare:
      sharesOutstanding != null &&
      sharesOutstanding > 0 &&
      summary?.financialData?.operatingCashflow != null
        ? summary.financialData.operatingCashflow / sharesOutstanding
        : null,
    revenuePerShare,
    pe: normalizeRatioField(summary?.summaryDetail?.trailingPE, { max: 150 }),
    pb: normalizeRatioField(summary?.defaultKeyStatistics?.priceToBook),
    peg: normalizeRatioField(summary?.defaultKeyStatistics?.pegRatio, {
      max: 10,
    }),
    priceToSales: normalizeRatioField(
      summary?.defaultKeyStatistics?.priceToSalesTrailing12Months
    ),
    evToEbitda: normalizeRatioField(
      summary?.defaultKeyStatistics?.enterpriseToEbitda,
      { max: 100 }
    ),
    currentRatio: normalizeRatioField(summary?.financialData?.currentRatio, {
      max: 20,
    }),
    quickRatio: normalizeRatioField(summary?.financialData?.quickRatio, {
      max: 20,
    }),
    roe: normalizePercentField(summary?.financialData?.returnOnEquity),
    roa: normalizePercentField(summary?.financialData?.returnOnAssets),
    grossMargin: normalizePercentField(summary?.financialData?.grossMargins),
    operatingMargin: normalizePercentField(summary?.financialData?.operatingMargins),
    profitMargin: normalizePercentField(summary?.financialData?.profitMargins),
    revenueGrowth: normalizePercentField(summary?.financialData?.revenueGrowth),
    earningsGrowth: normalizePercentField(summary?.financialData?.earningsGrowth),
    fcfGrowth: normalizePercentField(summary?.financialData?.freeCashflowGrowth),
    debtToEquity: debtNormalized.value,
    rawDebtToEquity: debtNormalized.raw,
    debtToEquityUncertain: debtNormalized.uncertain,
    marketCap: toFiniteNumber(summary?.summaryDetail?.marketCap),
    sharesOutstanding,
    fcfPerShareSource: fcfResolved.source,
  };
}

export function normalizeFinancials(input: {
  quote: YahooQuoteLike | null | undefined;
  summary: YahooSummaryLike | null | undefined;
  displaySymbol: string;
  yahooSymbol: string;
  market: Market;
  currency: "TWD" | "USD";
  name?: string | null;
}): NormalizedFinancialData {
  const fromQuote = normalizeYahooQuote(input.quote);
  const fromSummary = normalizeYahooSummary(input.summary);

  const pe =
    fromQuote.pe.value != null && !fromQuote.pe.unreliable
      ? fromQuote.pe
      : normalizeRatioField(input.summary?.summaryDetail?.trailingPE, { max: 150 });
  const pb =
    fromQuote.pb.value != null && !fromQuote.pb.unreliable
      ? fromQuote.pb
      : normalizeRatioField(input.summary?.defaultKeyStatistics?.priceToBook);

  const currentPrice = fromQuote.currentPrice ?? fromSummary.currentPrice;
  const eps = fromQuote.eps ?? fromSummary.eps;
  const marketCap = fromQuote.marketCap ?? fromSummary.marketCap;

  const base: NormalizedFinancialData = {
    displaySymbol: input.displaySymbol,
    yahooSymbol: input.yahooSymbol,
    name: input.name ?? fromQuote.name ?? fromSummary.name ?? input.displaySymbol,
    market: input.market,
    currency: input.currency,
    sector: fromSummary.sector,
    industry: fromSummary.industry,
    currentPrice,
    change: fromQuote.change,
    changePercent: fromQuote.changePercent,
    eps,
    forwardEps: fromSummary.forwardEps,
    bookValuePerShare: fromSummary.bookValuePerShare,
    freeCashFlowPerShare: fromSummary.freeCashFlowPerShare,
    operatingCashFlowPerShare: fromSummary.operatingCashFlowPerShare,
    revenuePerShare: fromSummary.revenuePerShare,
    pe,
    pb,
    peg: fromSummary.peg,
    priceToSales: fromSummary.priceToSales,
    evToEbitda: fromSummary.evToEbitda,
    currentRatio: fromSummary.currentRatio,
    quickRatio: fromSummary.quickRatio,
    roe: fromSummary.roe,
    roa: fromSummary.roa,
    grossMargin: fromSummary.grossMargin,
    operatingMargin: fromSummary.operatingMargin,
    profitMargin: fromSummary.profitMargin,
    revenueGrowth: fromSummary.revenueGrowth,
    earningsGrowth: fromSummary.earningsGrowth,
    fcfGrowth: fromSummary.fcfGrowth,
    debtToEquity: fromSummary.debtToEquity,
    rawDebtToEquity: fromSummary.rawDebtToEquity,
    debtToEquityUncertain: fromSummary.debtToEquityUncertain,
    marketCap,
    sharesOutstanding: fromSummary.sharesOutstanding,
    fcfPerShareSource: fromSummary.fcfPerShareSource,
    insufficientData: false,
    missingCriticalFields: [],
    companyClassification: "value",
  };

  const validation = validateFinancialData(base);
  base.insufficientData = validation.insufficientData;
  base.missingCriticalFields = validation.missingCriticalFields;

  return base;
}
