export type { CompanyClassification } from "./normalizer";
export type Market = "TW" | "US";

export interface StockFinancials {
  eps: number;
  bookValuePerShare: number;
  freeCashFlowPerShare: number;
  growthRate: number;
  roe: number;
  roa: number;
  grossMargin: number;
  operatingMargin: number;
  debtToEquity: number | null;
  pe: number;
  pb: number;
  peg: number;
  currentRatio: number | null;
  profitMargin: number;
  fcfMargin: number | null;
}

export interface StockInput {
  ticker: string;
  name: string;
  market: Market;
  currentPrice: number;
  change: number;
  changePercent: number;
  eps: number;
  bookValuePerShare: number;
  freeCashFlowPerShare: number;
  growthRate: number;
  roe: number;
  roa: number;
  grossMargin: number;
  operatingMargin: number;
  debtToEquity: number | null;
  pe: number;
  pb: number;
  peg: number;
  profitMargin: number;
  currentRatio: number | null;
  fcfMargin: number | null;
  marketCap: number | null;
  sector: string | null;
  industry: string | null;
  brandPower: number;
  technologyBarrier: number;
  scaleEconomy: number;
  switchingCost: number;
  networkEffect: number;
  managementScore: number;
  insufficientData: boolean;
  missingCriticalFields: string[];
  companyClassification: import("./normalizer").CompanyClassification;
  moatIsEstimate: boolean;
  fcfPerShareSource: import("./normalizer").FcfPerShareSource;
  debtToEquityUncertain: boolean;
  peUnreliable: boolean;
  peHighRisk: boolean;
}

export interface ValuationResult {
  dcfValue: number;
  peValue: number;
  pegValue: number;
  pbValue: number;
  fcfMultipleValue: number;
  fairValue: number;
  safetyPrice: number;
  bullCasePrice: number;
  marginOfSafety: number;
  companyClassification: import("./normalizer").CompanyClassification;
  weights: import("./valuation").ValuationWeights;
  dcfWasClamped: boolean;
}

export interface MoatScore {
  brandPower: number;
  technologyBarrier: number;
  scaleEconomy: number;
  switchingCost: number;
  networkEffect: number;
  moatScore: number;
}

export type AnalysisEntrySignal =
  | "STRONG_WATCH"
  | "WATCH"
  | "CAUTIOUS"
  | "AVOID";

export interface EntrySignalResult {
  signal: AnalysisEntrySignal;
  label: string;
}

/** @deprecated Use AnalysisEntrySignal */
export type AnalysisBuySignal = AnalysisEntrySignal;

/** @deprecated Use EntrySignalResult */
export type BuySignalResult = EntrySignalResult;

export interface StockAnalysisResult {
  ticker: string;
  name: string;
  market: Market;
  currentPrice: number;
  currency: "TWD" | "USD";
  change: number;
  changePercent: number;
  valuation: ValuationResult;
  entrySignal: EntrySignalResult;
  moat: MoatScore;
  financialScore: number;
  growthScore: number;
  managementScore: number;
  buffettScore: number;
  valuationScore: number;
  totalScore: number;
  entryScore: number;
  entryLabel: string;
  aiSummary: string;
  insufficientData: boolean;
  moatIsEstimate: boolean;
  managementIsEstimate: boolean;
  valuationConfidence: import("./entry").ValuationConfidence;
  companyClassification: import("./normalizer").CompanyClassification;
  radarEligible: boolean;
  undervaluedFocusEligible: boolean;
  highQualityWatchEligible: boolean;
}
