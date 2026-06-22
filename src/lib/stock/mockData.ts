import type { StockInput } from "./types";
import type { CompanyClassification } from "./normalizer";

const MOCK_DEFAULTS: Omit<
  StockInput,
  | "ticker"
  | "name"
  | "market"
  | "currentPrice"
  | "change"
  | "changePercent"
  | "eps"
  | "bookValuePerShare"
  | "freeCashFlowPerShare"
  | "growthRate"
  | "roe"
  | "roa"
  | "grossMargin"
  | "operatingMargin"
  | "debtToEquity"
  | "pe"
  | "pb"
  | "peg"
  | "brandPower"
  | "technologyBarrier"
  | "scaleEconomy"
  | "switchingCost"
  | "networkEffect"
  | "managementScore"
> = {
  profitMargin: 0,
  currentRatio: null,
  fcfMargin: null,
  marketCap: null,
  sector: null,
  industry: null,
  insufficientData: false,
  missingCriticalFields: [],
  companyClassification: "quality_compounder",
  moatIsEstimate: true,
  fcfPerShareSource: "reported",
  debtToEquityUncertain: false,
  peUnreliable: false,
  peHighRisk: false,
};

function inferMockClassification(growthRate: number): CompanyClassification {
  if (growthRate >= 15) return "growth";
  if (growthRate >= 8) return "quality_compounder";
  return "value";
}

type MockStockSeed = Omit<
  StockInput,
  | "profitMargin"
  | "currentRatio"
  | "fcfMargin"
  | "marketCap"
  | "sector"
  | "industry"
  | "insufficientData"
  | "missingCriticalFields"
  | "companyClassification"
  | "moatIsEstimate"
  | "fcfPerShareSource"
  | "debtToEquityUncertain"
  | "peUnreliable"
  | "peHighRisk"
>;

export const MOCK_STOCKS: Record<string, MockStockSeed> = {
  "2330": {
    ticker: "2330",
    name: "台積電",
    market: "TW",
    currentPrice: 1180,
    change: 14,
    changePercent: 1.2,
    eps: 45.2,
    bookValuePerShare: 182,
    freeCashFlowPerShare: 52,
    growthRate: 18,
    roe: 28,
    roa: 15.2,
    grossMargin: 53.1,
    operatingMargin: 42.5,
    debtToEquity: 0.24,
    pe: 26.1,
    pb: 6.5,
    peg: 1.45,
    brandPower: 92,
    technologyBarrier: 98,
    scaleEconomy: 96,
    switchingCost: 94,
    networkEffect: 88,
    managementScore: 90,
  },
  "2454": {
    ticker: "2454",
    name: "聯發科",
    market: "TW",
    currentPrice: 1285,
    change: 18,
    changePercent: 1.42,
    eps: 98.5,
    bookValuePerShare: 420,
    freeCashFlowPerShare: 88,
    growthRate: 22,
    roe: 24.5,
    roa: 14.8,
    grossMargin: 48.2,
    operatingMargin: 22.5,
    debtToEquity: 0.18,
    pe: 13.1,
    pb: 3.1,
    peg: 0.6,
    brandPower: 78,
    technologyBarrier: 85,
    scaleEconomy: 72,
    switchingCost: 68,
    networkEffect: 65,
    managementScore: 82,
  },
  "2317": {
    ticker: "2317",
    name: "鴻海",
    market: "TW",
    currentPrice: 178,
    change: -2.5,
    changePercent: -1.38,
    eps: 11.2,
    bookValuePerShare: 95,
    freeCashFlowPerShare: 9.5,
    growthRate: 8,
    roe: 11.8,
    roa: 4.2,
    grossMargin: 6.8,
    operatingMargin: 3.2,
    debtToEquity: 0.45,
    pe: 15.9,
    pb: 1.9,
    peg: 2.0,
    brandPower: 70,
    technologyBarrier: 65,
    scaleEconomy: 78,
    switchingCost: 72,
    networkEffect: 60,
    managementScore: 72,
  },
  NVDA: {
    ticker: "NVDA",
    name: "NVIDIA",
    market: "US",
    currentPrice: 142,
    change: 3.5,
    changePercent: 2.53,
    eps: 2.48,
    bookValuePerShare: 12.4,
    freeCashFlowPerShare: 2.15,
    growthRate: 35,
    roe: 115,
    roa: 45,
    grossMargin: 75.2,
    operatingMargin: 55.8,
    debtToEquity: 0.22,
    pe: 57.3,
    pb: 11.5,
    peg: 1.64,
    brandPower: 95,
    technologyBarrier: 98,
    scaleEconomy: 90,
    switchingCost: 93,
    networkEffect: 92,
    managementScore: 88,
  },
  AAPL: {
    ticker: "AAPL",
    name: "Apple",
    market: "US",
    currentPrice: 228.52,
    change: -1.15,
    changePercent: -0.5,
    eps: 6.75,
    bookValuePerShare: 4.52,
    freeCashFlowPerShare: 6.2,
    growthRate: 8,
    roe: 160,
    roa: 28.5,
    grossMargin: 46.2,
    operatingMargin: 30.5,
    debtToEquity: 1.75,
    pe: 33.9,
    pb: 50.6,
    peg: 4.2,
    brandPower: 98,
    technologyBarrier: 85,
    scaleEconomy: 88,
    switchingCost: 95,
    networkEffect: 90,
    managementScore: 90,
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft",
    market: "US",
    currentPrice: 415,
    change: 5.2,
    changePercent: 1.27,
    eps: 11.5,
    bookValuePerShare: 18.2,
    freeCashFlowPerShare: 10.5,
    growthRate: 14,
    roe: 35,
    roa: 18.5,
    grossMargin: 69.5,
    operatingMargin: 44.2,
    debtToEquity: 0.48,
    pe: 36.1,
    pb: 12.8,
    peg: 2.58,
    brandPower: 94,
    technologyBarrier: 90,
    scaleEconomy: 92,
    switchingCost: 88,
    networkEffect: 93,
    managementScore: 92,
  },
  GOOGL: {
    ticker: "GOOGL",
    name: "Alphabet",
    market: "US",
    currentPrice: 178.35,
    change: 2.1,
    changePercent: 1.19,
    eps: 6.52,
    bookValuePerShare: 25.1,
    freeCashFlowPerShare: 5.8,
    growthRate: 12,
    roe: 28,
    roa: 18.2,
    grossMargin: 56.5,
    operatingMargin: 28.4,
    debtToEquity: 0.12,
    pe: 27.4,
    pb: 5.5,
    peg: 2.28,
    brandPower: 90,
    technologyBarrier: 92,
    scaleEconomy: 85,
    switchingCost: 80,
    networkEffect: 95,
    managementScore: 78,
  },
};

export function getMockStock(ticker: string): StockInput | null {
  const key = ticker.toUpperCase();
  const raw = MOCK_STOCKS[key] ?? MOCK_STOCKS[ticker];
  if (!raw) return null;
  return {
    ...MOCK_DEFAULTS,
    ...raw,
    profitMargin: raw.grossMargin * 0.65,
    companyClassification: inferMockClassification(raw.growthRate),
  };
}

export function getAllMockTickers(): string[] {
  return Object.keys(MOCK_STOCKS);
}

export function getMockStocksByMarket(market: "TW" | "US"): StockInput[] {
  return Object.keys(MOCK_STOCKS)
    .map((ticker) => getMockStock(ticker))
    .filter((stock): stock is StockInput => stock != null && stock.market === market);
}
