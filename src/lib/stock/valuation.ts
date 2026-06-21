import type { StockFinancials, ValuationResult } from "./types";

const DCF_DISCOUNT_RATE = 0.1;
const DCF_TERMINAL_GROWTH_CAP = 0.15;
const GROWTH_STOCK_THRESHOLD = 20;

export type CompanyValuationType = "growth" | "value";

const VALUE_WEIGHTS = { dcf: 0.4, pe: 0.3, peg: 0.2, pb: 0.1 };
const GROWTH_WEIGHTS = { dcf: 0.2, pe: 0.35, peg: 0.35, pb: 0.1 };

export function getCompanyValuationType(growthRate: number): CompanyValuationType {
  return growthRate > GROWTH_STOCK_THRESHOLD ? "growth" : "value";
}

export function getValuationWeights(growthRate: number) {
  return growthRate > GROWTH_STOCK_THRESHOLD ? GROWTH_WEIGHTS : VALUE_WEIGHTS;
}

export function calculateDCFValue(financials: StockFinancials): number {
  const growth = Math.min(financials.growthRate / 100, DCF_TERMINAL_GROWTH_CAP);
  const discount = Math.max(DCF_DISCOUNT_RATE, growth + 0.025);

  if (financials.freeCashFlowPerShare <= 0) {
    return 0;
  }

  return (financials.freeCashFlowPerShare * (1 + growth)) / (discount - growth);
}

export function calculatePEValue(financials: StockFinancials): number {
  if (financials.eps <= 0) return 0;
  const fairPE = Math.max(financials.pe * 0.92, 8);
  return financials.eps * fairPE;
}

export function calculatePEGValue(financials: StockFinancials): number {
  if (financials.eps <= 0) return 0;
  const growth = Math.max(financials.growthRate, 1);
  const fairPE = growth / Math.max(financials.peg, 0.5);
  return financials.eps * fairPE;
}

export function calculatePBValue(financials: StockFinancials): number {
  if (financials.bookValuePerShare <= 0) return 0;
  const fairPB = Math.min(Math.max(financials.pb * 0.9, 1), 12);
  return financials.bookValuePerShare * fairPB;
}

export function calculateFairValue(
  financials: StockFinancials,
  currentPrice: number
): ValuationResult {
  const dcfValue = calculateDCFValue(financials);
  const peValue = calculatePEValue(financials);
  const pegValue = calculatePEGValue(financials);
  const pbValue = calculatePBValue(financials);

  const companyType = getCompanyValuationType(financials.growthRate);
  const weights = getValuationWeights(financials.growthRate);

  const fairValue =
    dcfValue * weights.dcf +
    peValue * weights.pe +
    pegValue * weights.peg +
    pbValue * weights.pb;

  const safeFairValue = fairValue > 0 ? fairValue : currentPrice;
  const marginOfSafety =
    safeFairValue > 0
      ? ((safeFairValue - currentPrice) / safeFairValue) * 100
      : 0;

  return {
    dcfValue,
    peValue,
    pegValue,
    pbValue,
    fairValue: safeFairValue,
    safetyPrice: safeFairValue * 0.8,
    bullCasePrice: safeFairValue * 1.25,
    marginOfSafety,
    companyType,
  };
}
