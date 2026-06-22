import type { CompanyClassification, NormalizedFinancialData } from "./normalizer";
import type { MoatScore, StockInput } from "./types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scaleFromMarketCap(marketCap: number | null): number {
  if (marketCap == null || marketCap <= 0) return 50;
  const billions = marketCap / 1_000_000_000;
  if (billions >= 500) return 95;
  if (billions >= 100) return 88;
  if (billions >= 30) return 78;
  if (billions >= 10) return 68;
  if (billions >= 2) return 58;
  return 45;
}

function sectorMoatBoost(industryText: string): {
  brand: number;
  technology: number;
  network: number;
  switching: number;
  scale: number;
} {
  if (/semiconductor|chip|foundry/i.test(industryText)) {
    return { brand: 8, technology: 14, network: 4, switching: 10, scale: 12 };
  }
  if (/software|platform|internet|cloud/i.test(industryText)) {
    return { brand: 10, technology: 12, network: 14, switching: 12, scale: 8 };
  }
  if (/consumer|brand|luxury|beverage/i.test(industryText)) {
    return { brand: 14, technology: 4, network: 6, switching: 8, scale: 8 };
  }
  if (/financial|bank|insurance/i.test(industryText)) {
    return { brand: 6, technology: 4, network: 8, switching: 12, scale: 10 };
  }
  return { brand: 4, technology: 4, network: 4, switching: 4, scale: 4 };
}

export function estimateMoatFromFinancials(input: {
  grossMargin: number | null;
  operatingMargin: number | null;
  roe: number | null;
  roa: number | null;
  revenueGrowth: number | null;
  marketCap: number | null;
  industry: string | null;
  sector: string | null;
  classification: CompanyClassification;
}): MoatScore & { isEstimate: boolean } {
  const grossMargin = input.grossMargin ?? 0;
  const operatingMargin = input.operatingMargin ?? 0;
  const roe = input.roe ?? 0;
  const roa = input.roa ?? 0;
  const growth = input.revenueGrowth ?? 0;
  const industryText = `${input.sector ?? ""} ${input.industry ?? ""}`;
  const sectorBoost = sectorMoatBoost(industryText);
  const scaleSignal = scaleFromMarketCap(input.marketCap);

  const brandPower = clampScore(
    grossMargin * 0.55 +
      operatingMargin * 0.35 +
      scaleSignal * 0.25 +
      sectorBoost.brand
  );
  const technologyBarrier = clampScore(
    operatingMargin * 0.45 +
      roe * 0.85 +
      growth * 0.35 +
      sectorBoost.technology
  );
  const scaleEconomy = clampScore(
    scaleSignal * 0.7 + operatingMargin * 0.2 + sectorBoost.scale
  );
  const switchingCost = clampScore(
    operatingMargin * 0.4 +
      grossMargin * 0.25 +
      roa * 1.5 +
      sectorBoost.switching
  );
  const networkEffect = clampScore(
    growth * 0.9 + scaleSignal * 0.35 + sectorBoost.network
  );

  const moatScore = clampScore(
    (brandPower +
      technologyBarrier +
      scaleEconomy +
      switchingCost +
      networkEffect) /
      5
  );

  return {
    brandPower,
    technologyBarrier,
    scaleEconomy,
    switchingCost,
    networkEffect,
    moatScore,
    isEstimate: true,
  };
}

export function calculateMoatScore(
  stock: Pick<
    StockInput,
    | "brandPower"
    | "technologyBarrier"
    | "scaleEconomy"
    | "switchingCost"
    | "networkEffect"
  >
): MoatScore {
  const {
    brandPower,
    technologyBarrier,
    scaleEconomy,
    switchingCost,
    networkEffect,
  } = stock;

  const moatScore = clampScore(
    (brandPower +
      technologyBarrier +
      scaleEconomy +
      switchingCost +
      networkEffect) /
      5
  );

  return {
    brandPower: clampScore(brandPower),
    technologyBarrier: clampScore(technologyBarrier),
    scaleEconomy: clampScore(scaleEconomy),
    switchingCost: clampScore(switchingCost),
    networkEffect: clampScore(networkEffect),
    moatScore,
  };
}

export function buildMoatFromNormalized(
  data: NormalizedFinancialData
): MoatScore & { isEstimate: boolean } {
  return estimateMoatFromFinancials({
    grossMargin: data.grossMargin,
    operatingMargin: data.operatingMargin,
    roe: data.roe,
    roa: data.roa,
    revenueGrowth: data.revenueGrowth,
    marketCap: data.marketCap,
    industry: data.industry,
    sector: data.sector,
    classification: data.companyClassification,
  });
}
