import type { StockFinancials, ValuationResult } from "./types";

const DCF_DISCOUNT_RATE = 0.1;
const DCF_TERMINAL_GROWTH_CAP = 0.05;

export function calculateDCFValue(financials: StockFinancials): number {
  const growth = Math.min(financials.growthRate / 100, DCF_TERMINAL_GROWTH_CAP);
  const discount = DCF_DISCOUNT_RATE;

  if (discount <= growth || financials.freeCashFlowPerShare <= 0) {
    return Math.max(financials.freeCashFlowPerShare * 15, 0);
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

  const fairValue =
    dcfValue * 0.4 +
    peValue * 0.3 +
    pegValue * 0.2 +
    pbValue * 0.1;

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
  };
}
