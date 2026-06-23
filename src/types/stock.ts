export type Market = "TW" | "US";

export type EntrySignal = "strong_watch" | "watch" | "cautious" | "avoid";

/** @deprecated Use EntrySignal */
export type BuySignal = EntrySignal;

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
  valuationModel?: string;
  valuationConfidence?: "high" | "medium" | "low";
  dcfWasClamped?: boolean;
  dcfAdjustmentNote?: string;
}

export interface MoatAnalysis {
  score: number;
  brand: number;
  technology: number;
  networkEffect: number;
  scaleEconomy: number;
  switchingCost: number;
  summary: string;
  isEstimate?: boolean;
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

export type MaybeNumber = number | null;

export interface FinancialProfile {
  score: number;
  roe: MaybeNumber;
  roa: MaybeNumber;
  grossMargin: MaybeNumber;
  operatingMargin: MaybeNumber;
  debtToEquity: MaybeNumber;
  eps: MaybeNumber;
  growthRate: MaybeNumber;
  pe: MaybeNumber;
  pb: MaybeNumber;
  marketCap: MaybeNumber;
}

export interface StockAnalysis extends StockQuote {
  industry: string | null;
  aiScore: AIScoreBreakdown;
  totalScore: number;
  entryScore: number;
  entryLabel: string;
  entrySignal: EntrySignal;
  valuation: ValuationAnalysis;
  moat: MoatAnalysis;
  financialProfile: FinancialProfile;
  keyPersonRisk: KeyPersonRisk;
  buffett: BuffettScore;
  aiConclusion: AIConclusion;
  radarEligible: boolean;
  undervaluedFocusEligible: boolean;
  highQualityWatchEligible: boolean;
  managementIsEstimate: boolean;
  companyClassification?: string;
}

export interface HomeStockCard {
  symbol: string;
  name: string;
  market: Market;
  score: number;
  entryLabel: string;
  entrySignal: EntrySignal;
  price: number;
  fairPrice: number;
  undervaluedPercent: number;
  currency: "TWD" | "USD";
}

export interface HomeMarketFeed {
  todayFocus: HomeStockCard[];
  undervalued: HomeStockCard[];
  highQuality: HomeStockCard[];
  moat: HomeStockCard[];
}

export interface HomeFeedResponse {
  scanning: boolean;
  message?: string;
  feed: HomeMarketFeed;
  sectionCounts: {
    todayFocus: number;
    undervalued: number;
    highQuality: number;
    moat: number;
  };
  lastScannedAt: string | null;
}

/** @deprecated Use HomeStockCard */
export type AIRecommendation = HomeStockCard;

export interface WatchlistItem extends StockQuote {
  aiScore: number;
  entryLabel: string;
  entrySignal: EntrySignal;
  sparkline: number[];
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface PortfolioLedger {
  positions: PortfolioPosition[];
}

export interface CurrencyTotals {
  totalAssets: number;
  totalCost: number;
  unrealizedPnL: number;
  returnPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
}

export interface ComputedPortfolio {
  holdings: PortfolioHolding[];
  totalsByCurrency: Partial<Record<"TWD" | "USD", CurrencyTotals>>;
  bySymbol: AllocationSlice[];
  byIndustry: AllocationSlice[];
  byCountry: AllocationSlice[];
  displayCurrency: "TWD" | "USD";
  hasMixedCurrency: boolean;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  shares: number;
  avgCost: number;
  currentPrice: number;
  weight: number;
  returnPercent: number;
  unrealizedPnL: number;
  marketValue: number;
  dailyPnL: number;
  currency: "TWD" | "USD";
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
