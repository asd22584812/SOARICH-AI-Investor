import type { NormalizedFinancialData } from "./normalizer";
import { buildMoatFromNormalized } from "./moat";
import type { StockInput } from "./types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function coalesceNumber(value: number | null, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function estimateManagementScore(
  financialQuality: number,
  moatScore: number,
  roe: number | null
): number {
  const roeBoost = roe != null ? clamp(roe * 1.2, 0, 30) : 0;
  return clamp(financialQuality * 0.55 + moatScore * 0.25 + roeBoost);
}

export function buildStockInputFromNormalized(
  data: NormalizedFinancialData
): StockInput | null {
  if (data.currentPrice == null || data.currentPrice <= 0) return null;

  const moat = buildMoatFromNormalized(data);
  const roe = data.roe;
  const roa = data.roa;
  const operatingMargin = data.operatingMargin ?? 0;
  const grossMargin = data.grossMargin ?? 0;

  const financialQuality = clamp(
    (roe ?? 0) * 0.7 + (roa ?? 0) * 1.1 + operatingMargin * 0.45
  );
  const managementScore = estimateManagementScore(
    financialQuality,
    moat.moatScore,
    roe
  );

  const revenuePerShare = data.revenuePerShare ?? 0;
  const fcfMargin =
    revenuePerShare > 0 && data.freeCashFlowPerShare != null
      ? (data.freeCashFlowPerShare / revenuePerShare) * 100
      : null;

  return {
    ticker: data.displaySymbol,
    name: data.name,
    market: data.market,
    currentPrice: data.currentPrice,
    change: coalesceNumber(data.change),
    changePercent: coalesceNumber(data.changePercent),
    eps: coalesceNumber(data.eps),
    bookValuePerShare: coalesceNumber(data.bookValuePerShare),
    freeCashFlowPerShare: coalesceNumber(data.freeCashFlowPerShare),
    growthRate: coalesceNumber(data.revenueGrowth),
    roe: coalesceNumber(roe),
    roa: coalesceNumber(roa),
    grossMargin: coalesceNumber(grossMargin),
    operatingMargin: coalesceNumber(operatingMargin),
    debtToEquity: data.debtToEquity,
    pe: coalesceNumber(data.pe.value),
    pb: coalesceNumber(data.pb.value),
    peg: coalesceNumber(data.peg.value),
    profitMargin: coalesceNumber(data.profitMargin),
    currentRatio: data.currentRatio.value,
    fcfMargin,
    marketCap: data.marketCap,
    sector: data.sector,
    industry: data.industry,
    brandPower: moat.brandPower,
    technologyBarrier: moat.technologyBarrier,
    scaleEconomy: moat.scaleEconomy,
    switchingCost: moat.switchingCost,
    networkEffect: moat.networkEffect,
    managementScore,
    insufficientData: data.insufficientData,
    missingCriticalFields: data.missingCriticalFields,
    companyClassification: data.companyClassification,
    moatIsEstimate: moat.isEstimate,
    fcfPerShareSource: data.fcfPerShareSource,
  };
}

export function snapshotToNullableMetrics(
  data: NormalizedFinancialData
) {
  return {
    eps: data.eps,
    pe: data.pe.value,
    pb: data.pb.value,
    marketCap: data.marketCap,
    growthRate: data.revenueGrowth,
    roe: data.roe,
    roa: data.roa,
    grossMargin: data.grossMargin,
    operatingMargin: data.operatingMargin,
    debtToEquity: data.debtToEquity,
    peg: data.peg.value,
    industry: data.industry ?? data.sector,
    insufficientData: data.insufficientData,
    companyClassification: data.companyClassification,
    radarEligible: !data.insufficientData,
  };
}

/** @deprecated Use buildStockInputFromNormalized */
export function buildStockInputFromYahoo(
  snapshot: import("./yahoo").YahooStockSnapshot
): StockInput | null {
  if (!snapshot.normalized) return null;
  return buildStockInputFromNormalized(snapshot.normalized);
}
