export type Market = "TW" | "US";

export type BuySignal =
  | "strongly_undervalued"
  | "good_buy"
  | "watch"
  | "overvalued"
  | "avoid";

export interface StockQuote {
  symbol: string;
  name: string;
  market: Market;
  price: number;
  change: number;
  changePercent: number;
  currency: "TWD" | "USD";
}

export interface AIScoreBreakdown {
  moat: number;
  financials: number;
  growth: number;
  management: number;
  valuation: number;
}

export interface ValuationAnalysis {
  safetyPrice: number;
  fairPrice: number;
  optimisticPrice: number;
  dcfValue: number;
  marginOfSafety: number;
}

export interface MoatAnalysis {
  score: number;
  brand: number;
  technology: number;
  networkEffect: number;
  scaleEconomy: number;
  switchingCost: number;
  summary: string;
}

export type RiskLevel = "high" | "medium" | "low";

export interface KeyPersonRisk {
  level: RiskLevel;
  ceo: string;
  founder: string;
  succession: string;
  teamMaturity: string;
}

export interface BuffettScore {
  score: number;
  roe: number;
  freeCashFlow: number;
  debtRatio: number;
  moat: number;
  profitStability: number;
  summary: string;
}

export interface AIConclusion {
  isUndervalued: boolean;
  suitableForDCA: boolean;
  undervaluedPercent: number;
  highlights: string[];
  mainRisks: string[];
  growthOutlook: string;
  summary: string;
}

export interface FinancialProfile {
  score: number;
  roe: number;
  roa: number;
  grossMargin: number;
  operatingMargin: number;
  debtToEquity: number;
  eps: number;
  growthRate: number;
  pe: number;
  pb: number;
}

export interface StockAnalysis extends StockQuote {
  aiScore: AIScoreBreakdown;
  totalScore: number;
  buySignal: BuySignal;
  valuation: ValuationAnalysis;
  moat: MoatAnalysis;
  financialProfile: FinancialProfile;
  keyPersonRisk: KeyPersonRisk;
  buffett: BuffettScore;
  aiConclusion: AIConclusion;
}

export interface AIRecommendation {
  symbol: string;
  name: string;
  market: Market;
  score: number;
  buySignal: BuySignal;
  price: number;
  fairPrice: number;
  undervaluedPercent: number;
  currency: "TWD" | "USD";
}

export interface WatchlistItem extends StockQuote {
  aiScore: number;
  buySignal: BuySignal;
  sparkline: number[];
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  market: Market;
  shares: number;
  avgCost: number;
  currentPrice: number;
  weight: number;
  returnPercent: number;
  industry: string;
  country: string;
}

export interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}

export interface PortfolioSummary {
  totalAssets: number;
  totalReturn: number;
  totalReturnPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  currency: "TWD" | "USD";
  holdings: PortfolioHolding[];
  byIndustry: AllocationSlice[];
  byCountry: AllocationSlice[];
}

export interface AssetOverview {
  totalAssets: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  currency: "TWD" | "USD";
}
