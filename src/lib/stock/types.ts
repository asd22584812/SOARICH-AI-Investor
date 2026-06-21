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
  debtToEquity: number;
  pe: number;
  pb: number;
  peg: number;
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
  debtToEquity: number;
  pe: number;
  pb: number;
  peg: number;
  brandPower: number;
  technologyBarrier: number;
  scaleEconomy: number;
  switchingCost: number;
  networkEffect: number;
  managementScore: number;
}

export interface ValuationResult {
  dcfValue: number;
  peValue: number;
  pegValue: number;
  pbValue: number;
  fairValue: number;
  safetyPrice: number;
  bullCasePrice: number;
  marginOfSafety: number;
}

export interface MoatScore {
  brandPower: number;
  technologyBarrier: number;
  scaleEconomy: number;
  switchingCost: number;
  networkEffect: number;
  moatScore: number;
}

export type AnalysisBuySignal =
  | "STRONG_UNDERVALUED"
  | "BUY"
  | "WATCH"
  | "OVERVALUED"
  | "AVOID";

export interface BuySignalResult {
  signal: AnalysisBuySignal;
  label: string;
}

export interface StockAnalysisResult {
  ticker: string;
  name: string;
  market: Market;
  currentPrice: number;
  currency: "TWD" | "USD";
  change: number;
  changePercent: number;
  valuation: ValuationResult;
  buySignal: BuySignalResult;
  moat: MoatScore;
  financialScore: number;
  growthScore: number;
  managementScore: number;
  buffettScore: number;
  totalScore: number;
  aiSummary: string;
}
