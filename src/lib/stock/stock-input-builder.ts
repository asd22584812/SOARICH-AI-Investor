import type { StockInput } from "./types";
import type { YahooStockSnapshot } from "./yahoo";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function coalesceNumber(value: number | null, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function estimateMoatFromFundamentals(snapshot: YahooStockSnapshot) {
  const roe = snapshot.roe ?? 0;
  const margin = snapshot.operatingMargin ?? snapshot.grossMargin ?? 0;
  const growth = snapshot.revenueGrowth ?? 0;
  const marketCap = snapshot.marketCap ?? 0;

  const scaleSignal = marketCap > 0 ? clamp(Math.log10(marketCap) * 12, 40, 98) : 55;
  const qualitySignal = clamp(roe * 1.2 + margin * 0.6, 35, 98);
  const growthSignal = clamp(growth * 1.5 + 40, 35, 98);

  return {
    brandPower: clamp(scaleSignal * 0.55 + qualitySignal * 0.45),
    technologyBarrier: clamp(qualitySignal * 0.7 + growthSignal * 0.3),
    scaleEconomy: clamp(scaleSignal),
    switchingCost: clamp(qualitySignal * 0.65 + scaleSignal * 0.35),
    networkEffect: clamp(growthSignal * 0.55 + scaleSignal * 0.45),
  };
}

export function buildStockInputFromYahoo(snapshot: YahooStockSnapshot): StockInput | null {
  if (snapshot.currentPrice == null) return null;

  const moat = estimateMoatFromFundamentals(snapshot);
  const financialQuality = clamp(
    (snapshot.roe ?? 0) * 0.8 +
      (snapshot.roa ?? 0) * 1.2 +
      (snapshot.operatingMargin ?? 0) * 0.5
  );
  const managementScore = clamp(
    financialQuality * 0.6 +
      moat.brandPower * 0.2 +
      moat.technologyBarrier * 0.2
  );

  const growthRate = coalesceNumber(snapshot.revenueGrowth);
  const eps = coalesceNumber(snapshot.eps);
  const pe = coalesceNumber(snapshot.pe);
  const pb = coalesceNumber(snapshot.pb);
  const peg = coalesceNumber(snapshot.peg);

  return {
    ticker: snapshot.displaySymbol,
    name: snapshot.name,
    market: snapshot.market,
    currentPrice: snapshot.currentPrice,
    change: coalesceNumber(snapshot.change),
    changePercent: coalesceNumber(snapshot.changePercent),
    eps,
    bookValuePerShare: coalesceNumber(snapshot.bookValuePerShare),
    freeCashFlowPerShare: coalesceNumber(snapshot.freeCashFlowPerShare),
    growthRate,
    roe: coalesceNumber(snapshot.roe),
    roa: coalesceNumber(snapshot.roa),
    grossMargin: coalesceNumber(snapshot.grossMargin),
    operatingMargin: coalesceNumber(snapshot.operatingMargin),
    debtToEquity: coalesceNumber(snapshot.debtToEquity),
    pe,
    pb,
    peg,
    brandPower: moat.brandPower,
    technologyBarrier: moat.technologyBarrier,
    scaleEconomy: moat.scaleEconomy,
    switchingCost: moat.switchingCost,
    networkEffect: moat.networkEffect,
    managementScore,
  };
}

export function snapshotToNullableMetrics(snapshot: YahooStockSnapshot) {
  return {
    eps: snapshot.eps,
    pe: snapshot.pe,
    pb: snapshot.pb,
    marketCap: snapshot.marketCap,
    growthRate: snapshot.revenueGrowth,
    roe: snapshot.roe,
    roa: snapshot.roa,
    grossMargin: snapshot.grossMargin,
    operatingMargin: snapshot.operatingMargin,
    debtToEquity: snapshot.debtToEquity,
    peg: snapshot.peg,
    industry: snapshot.industry,
  };
}
