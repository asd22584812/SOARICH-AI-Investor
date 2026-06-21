import type { StockFinancials, ValuationResult } from "./types";

const DISCOUNT_RATE = 0.1;
const TERMINAL_GROWTH = 0.025;
const STAGE1_YEARS = 5;
const GROWTH_STOCK_THRESHOLD = 20;
const STAGE1_GROWTH_CAP = { growth: 18, value: 10 } as const;
const DCF_MAX_PRICE_MULTIPLIER = 2.2;
const DCF_MIN_PRICE_MULTIPLIER = 0.35;
const DCF_EPS_FALLBACK_MULTIPLIER = 12;

export type CompanyValuationType = "growth" | "value";

const VALUE_WEIGHTS = { dcf: 0.4, pe: 0.3, peg: 0.2, pb: 0.1 };
const GROWTH_WEIGHTS = { dcf: 0.2, pe: 0.35, peg: 0.35, pb: 0.1 };

export function getCompanyValuationType(growthRate: number): CompanyValuationType {
  return growthRate > GROWTH_STOCK_THRESHOLD ? "growth" : "value";
}

export function getValuationWeights(growthRate: number) {
  return growthRate > GROWTH_STOCK_THRESHOLD ? GROWTH_WEIGHTS : VALUE_WEIGHTS;
}

function getStage1GrowthRate(growthRate: number): number {
  const isGrowthStock = growthRate > GROWTH_STOCK_THRESHOLD;
  const cap = isGrowthStock ? STAGE1_GROWTH_CAP.growth : STAGE1_GROWTH_CAP.value;
  return Math.min(growthRate, cap) / 100;
}

function clampDCFValue(dcfValue: number, currentPrice: number): number {
  const maxDcf = currentPrice * DCF_MAX_PRICE_MULTIPLIER;
  const minDcf = currentPrice * DCF_MIN_PRICE_MULTIPLIER;
  return Math.max(minDcf, Math.min(maxDcf, dcfValue));
}

export function calculateDCFValue(
  financials: StockFinancials,
  currentPrice: number
): number {
  if (financials.freeCashFlowPerShare <= 0) {
    return financials.eps > 0
      ? financials.eps * DCF_EPS_FALLBACK_MULTIPLIER
      : 0;
  }

  const stage1Growth = getStage1GrowthRate(financials.growthRate);
  let fcf = financials.freeCashFlowPerShare;
  let dcfValue = 0;

  for (let year = 1; year <= STAGE1_YEARS; year++) {
    fcf *= 1 + stage1Growth;
    dcfValue += fcf / Math.pow(1 + DISCOUNT_RATE, year);
  }

  const terminalValue =
    (fcf * (1 + TERMINAL_GROWTH)) / (DISCOUNT_RATE - TERMINAL_GROWTH);
  dcfValue += terminalValue / Math.pow(1 + DISCOUNT_RATE, STAGE1_YEARS);

  return clampDCFValue(dcfValue, currentPrice);
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
  const dcfValue = calculateDCFValue(financials, currentPrice);
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
