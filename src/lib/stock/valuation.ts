import type { CompanyClassification } from "./normalizer";
import type { StockFinancials, ValuationResult } from "./types";

const DISCOUNT_RATE = 0.1;
const TERMINAL_GROWTH = 0.025;
const STAGE1_YEARS = 5;
const GROWTH_STOCK_THRESHOLD = 15;
const STAGE1_GROWTH_CAP = { growth: 18, value: 10 } as const;
const DCF_MAX_PRICE_MULTIPLIER = 2.2;
const DCF_MIN_PRICE_MULTIPLIER = 0.35;
const DCF_EPS_FALLBACK_MULTIPLIER = 12;
const PEG_MIN_GROWTH = 8;

const FAIR_PE_RANGES: Record<
  Exclude<CompanyClassification, "insufficient_data">,
  [number, number]
> = {
  growth: [15, 45],
  quality_compounder: [18, 35],
  value: [8, 25],
  financial: [6, 18],
  cyclical: [8, 20],
};

export interface ValuationWeights {
  dcf: number;
  pe: number;
  peg: number;
  pb: number;
  fcfMultiple: number;
  roeQuality: number;
  dividendBook: number;
}

const WEIGHTS_BY_CLASSIFICATION: Record<
  Exclude<CompanyClassification, "insufficient_data">,
  ValuationWeights
> = {
  growth: {
    dcf: 0.25,
    pe: 0.3,
    peg: 0.3,
    pb: 0,
    fcfMultiple: 0.15,
    roeQuality: 0,
    dividendBook: 0,
  },
  quality_compounder: {
    dcf: 0.35,
    pe: 0.3,
    peg: 0,
    pb: 0.1,
    fcfMultiple: 0.25,
    roeQuality: 0,
    dividendBook: 0,
  },
  value: {
    dcf: 0.4,
    pe: 0.3,
    peg: 0,
    pb: 0.1,
    fcfMultiple: 0.2,
    roeQuality: 0,
    dividendBook: 0,
  },
  financial: {
    dcf: 0,
    pe: 0.2,
    peg: 0,
    pb: 0.4,
    fcfMultiple: 0,
    roeQuality: 0.25,
    dividendBook: 0.15,
  },
  cyclical: {
    dcf: 0.2,
    pe: 0.3,
    peg: 0,
    pb: 0.3,
    fcfMultiple: 0.2,
    roeQuality: 0,
    dividendBook: 0,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getStage1GrowthRate(
  growthRate: number,
  classification: CompanyClassification
): number {
  const isGrowthLike =
    classification === "growth" || growthRate > GROWTH_STOCK_THRESHOLD;
  const cap = isGrowthLike ? STAGE1_GROWTH_CAP.growth : STAGE1_GROWTH_CAP.value;
  return Math.min(Math.max(growthRate, 0), cap) / 100;
}

function clampDCFValue(dcfValue: number, currentPrice: number): number {
  const maxDcf = currentPrice * DCF_MAX_PRICE_MULTIPLIER;
  const minDcf = currentPrice * DCF_MIN_PRICE_MULTIPLIER;
  return Math.max(minDcf, Math.min(maxDcf, dcfValue));
}

export function getValuationWeights(
  classification: CompanyClassification
): ValuationWeights {
  if (classification === "insufficient_data") {
    return WEIGHTS_BY_CLASSIFICATION.value;
  }
  return WEIGHTS_BY_CLASSIFICATION[classification];
}

function getFairPE(
  financials: StockFinancials,
  classification: CompanyClassification
): number {
  if (classification === "insufficient_data") return 15;
  const [minPE, maxPE] = FAIR_PE_RANGES[classification];
  const growthFactor = clamp((financials.growthRate ?? 0) / 30, 0, 1);
  const roeFactor = clamp((financials.roe ?? 0) / 30, 0, 1);
  const marginFactor = clamp((financials.operatingMargin ?? 0) / 35, 0, 1);
  const blend = growthFactor * 0.45 + roeFactor * 0.35 + marginFactor * 0.2;
  return minPE + (maxPE - minPE) * blend;
}

export function calculateDCFValue(
  financials: StockFinancials,
  currentPrice: number,
  classification: CompanyClassification
): number {
  if (financials.freeCashFlowPerShare <= 0) {
    return financials.eps > 0
      ? financials.eps * DCF_EPS_FALLBACK_MULTIPLIER
      : 0;
  }

  const stage1Growth = getStage1GrowthRate(
    financials.growthRate,
    classification
  );
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

export function calculatePEValue(
  financials: StockFinancials,
  classification: CompanyClassification
): number {
  if (financials.eps <= 0) return 0;
  const fairPE = getFairPE(financials, classification);
  return financials.eps * fairPE;
}

export function calculatePEGValue(
  financials: StockFinancials,
  classification: CompanyClassification
): number {
  if (financials.eps <= 0) return 0;
  if (classification !== "growth") return 0;
  if (financials.growthRate < PEG_MIN_GROWTH) return 0;

  const growth = Math.max(financials.growthRate, PEG_MIN_GROWTH);
  const targetPeg = clamp(financials.peg > 0 ? financials.peg : 1.2, 0.8, 2.5);
  const fairPE = clamp(growth / targetPeg, 15, 45);
  return financials.eps * fairPE;
}

export function calculatePBValue(
  financials: StockFinancials,
  classification: CompanyClassification
): number {
  if (financials.bookValuePerShare <= 0) return 0;
  if (classification === "growth") return 0;

  const [minPB, maxPB] =
    classification === "financial" ? [0.6, 2.2] : [0.8, 4];
  const roeFactor = clamp((financials.roe ?? 10) / 25, 0, 1);
  const fairPB = minPB + (maxPB - minPB) * roeFactor;
  return financials.bookValuePerShare * fairPB;
}

export function calculateFCFMultipleValue(
  financials: StockFinancials,
  classification: CompanyClassification
): number {
  if (financials.freeCashFlowPerShare <= 0) return 0;

  const growth = Math.max(financials.growthRate, 0);
  let fairMultiple = 15;

  switch (classification) {
    case "growth":
      fairMultiple = 18 + Math.min(growth, 22) * 0.35;
      break;
    case "quality_compounder":
      fairMultiple = 20 + Math.min(growth, 18) * 0.3;
      break;
    case "value":
      fairMultiple = 12 + Math.min(growth, 10) * 0.25;
      break;
    case "cyclical":
      fairMultiple = 10 + Math.min(growth, 12) * 0.2;
      break;
    default:
      fairMultiple = 14 + Math.min(growth, 12) * 0.2;
  }

  return financials.freeCashFlowPerShare * clamp(fairMultiple, 10, 35);
}

function calculateRoeQualityValue(financials: StockFinancials): number {
  if (financials.bookValuePerShare <= 0) return 0;
  const roe = financials.roe ?? 10;
  const fairPB = clamp(0.7 + roe / 22, 0.6, 2.8);
  return financials.bookValuePerShare * fairPB;
}

function calculateDividendBookValue(financials: StockFinancials): number {
  if (financials.bookValuePerShare <= 0) return 0;
  const pb = financials.pb > 0 ? financials.pb : 1;
  const fairPB = clamp(pb * 0.85, 0.5, 2);
  return financials.bookValuePerShare * fairPB;
}

export interface ValuationOptions {
  peUnreliable?: boolean;
  peHighRisk?: boolean;
}

function applyPeRiskToWeights(
  weights: ValuationWeights,
  options?: ValuationOptions
): ValuationWeights {
  if (!options?.peUnreliable && !options?.peHighRisk) return weights;

  const adjusted = { ...weights };

  if (options.peUnreliable) {
    const removed = adjusted.pe + adjusted.peg;
    adjusted.pe = 0;
    adjusted.peg = 0;
    if (removed <= 0) return adjusted;

    const targets: (keyof ValuationWeights)[] = ["dcf", "fcfMultiple", "pb"];
    const targetSum = targets.reduce((sum, key) => sum + adjusted[key], 0);
    if (targetSum <= 0) return adjusted;

    for (const key of targets) {
      adjusted[key] += (adjusted[key] / targetSum) * removed;
    }
    return adjusted;
  }

  const peRemoved = adjusted.pe * 0.5;
  const pegRemoved = adjusted.peg * 0.5;
  adjusted.pe *= 0.5;
  adjusted.peg *= 0.5;
  const removed = peRemoved + pegRemoved;
  if (removed <= 0) return adjusted;

  const targets: (keyof ValuationWeights)[] = ["dcf", "fcfMultiple", "pb"];
  const targetSum = targets.reduce((sum, key) => sum + adjusted[key], 0);
  if (targetSum <= 0) return adjusted;

  for (const key of targets) {
    adjusted[key] += (adjusted[key] / targetSum) * removed;
  }

  return adjusted;
}

function redistributeWeights(
  weights: ValuationWeights,
  available: Partial<Record<keyof ValuationWeights, boolean>>
): ValuationWeights {
  const keys = Object.keys(weights) as (keyof ValuationWeights)[];
  const adjusted = { ...weights };
  let removed = 0;

  for (const key of keys) {
    if (available[key] === false) {
      removed += adjusted[key];
      adjusted[key] = 0;
    }
  }

  if (removed <= 0) return adjusted;

  const remaining = keys.filter((key) => adjusted[key] > 0);
  const remainingSum = remaining.reduce((sum, key) => sum + adjusted[key], 0);
  if (remainingSum <= 0) return adjusted;

  for (const key of remaining) {
    adjusted[key] += (adjusted[key] / remainingSum) * removed;
  }

  return adjusted;
}

export function calculateFairValue(
  financials: StockFinancials,
  currentPrice: number,
  classification: CompanyClassification,
  options?: ValuationOptions
): ValuationResult {
  const dcfValue = calculateDCFValue(financials, currentPrice, classification);
  const peValue = calculatePEValue(financials, classification);
  const pegValue = calculatePEGValue(financials, classification);
  const pbValue = calculatePBValue(financials, classification);
  const fcfMultipleValue = calculateFCFMultipleValue(financials, classification);
  const roeQualityValue = calculateRoeQualityValue(financials);
  const dividendBookValue = calculateDividendBookValue(financials);

  const baseWeights = applyPeRiskToWeights(
    getValuationWeights(classification),
    options
  );
  const weights = redistributeWeights(baseWeights, {
    dcf: dcfValue > 0,
    pe: peValue > 0,
    peg: pegValue > 0,
    pb: pbValue > 0,
    fcfMultiple: fcfMultipleValue > 0,
    roeQuality: roeQualityValue > 0,
    dividendBook: dividendBookValue > 0,
  });

  const fairValue =
    dcfValue * weights.dcf +
    peValue * weights.pe +
    pegValue * weights.peg +
    pbValue * weights.pb +
    fcfMultipleValue * weights.fcfMultiple +
    roeQualityValue * weights.roeQuality +
    dividendBookValue * weights.dividendBook;

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
    fcfMultipleValue,
    fairValue: safeFairValue,
    safetyPrice: safeFairValue * 0.8,
    bullCasePrice: safeFairValue * 1.25,
    marginOfSafety,
    companyClassification: classification,
    weights,
  };
}

export function calculateValuationScore(marginOfSafety: number): number {
  if (marginOfSafety >= 40) return 95;
  if (marginOfSafety >= 25) return 85;
  if (marginOfSafety >= 10) return 75;
  if (marginOfSafety >= 0) return 65;
  if (marginOfSafety >= -15) return 50;
  if (marginOfSafety >= -30) return 35;
  return 20;
}

/** @deprecated Use classification-based weights */
export function getCompanyValuationType(growthRate: number): "growth" | "value" {
  return growthRate > GROWTH_STOCK_THRESHOLD ? "growth" : "value";
}
