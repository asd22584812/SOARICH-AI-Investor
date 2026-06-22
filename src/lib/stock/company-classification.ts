import type { CompanyClassification, NormalizedFinancialData } from "./normalizer";

const FINANCIAL_PATTERN =
  /financial|bank|insurance|capital market|credit|mortgage|reit|broker|asset management/i;
const CYCLICAL_PATTERN =
  /steel|mining|oil|gas|energy|chemical|material|auto|construction|shipping|airline|cement|paper|commodity/i;
const TECH_PATTERN =
  /semiconductor|software|technology|internet|platform|cloud|electronic|chip|ai infrastructure/i;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function classifyCompany(
  data: NormalizedFinancialData
): CompanyClassification {
  if (data.insufficientData) return "insufficient_data";

  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`.toLowerCase();
  const growth = data.revenueGrowth ?? 0;
  const roe = data.roe ?? 0;
  const roa = data.roa ?? 0;
  const opMargin = data.operatingMargin ?? 0;
  const grossMargin = data.grossMargin ?? 0;
  const pe = data.pe.value ?? 0;
  const pb = data.pb.value ?? 0;
  const marketCap = data.marketCap ?? 0;
  const debt = data.debtToEquity;

  if (FINANCIAL_PATTERN.test(industryText)) {
    return "financial";
  }

  if (CYCLICAL_PATTERN.test(industryText)) {
    return "cyclical";
  }

  const isLargeCap = marketCap >= 50_000_000_000;
  const isMegaCap = marketCap >= 200_000_000_000;

  if (
    growth >= 15 &&
    (pe >= 22 || TECH_PATTERN.test(industryText) || opMargin >= 18)
  ) {
    return "growth";
  }

  if (
    roe >= 15 &&
    opMargin >= 12 &&
    growth >= 8 &&
    growth <= 28 &&
    (isLargeCap || grossMargin >= 35)
  ) {
    return "quality_compounder";
  }

  if (
    pb > 0 &&
    pb <= 2.5 &&
    pe > 0 &&
    pe <= 18 &&
    growth <= 12 &&
    (debt == null || debt <= 2)
  ) {
    return "financial";
  }

  if (growth < 8 && pe > 0 && pe <= 16 && pb > 0 && pb <= 3) {
    return "value";
  }

  if (isMegaCap && roe >= 12 && opMargin >= 10 && growth >= 6) {
    return "quality_compounder";
  }

  if (growth >= 12 || (TECH_PATTERN.test(industryText) && growth >= 8)) {
    return "growth";
  }

  if (roe >= 12 && roa >= 6 && opMargin >= 10) {
    return "quality_compounder";
  }

  if (pe > 0 && pe <= 18 && growth <= 10) {
    return "value";
  }

  return clamp(growth, 0, 100) >= 10 ? "growth" : "value";
}

export function applyCompanyClassification(
  data: NormalizedFinancialData
): NormalizedFinancialData {
  return {
    ...data,
    companyClassification: classifyCompany(data),
  };
}

export function isLightAssetModel(classification: CompanyClassification): boolean {
  return classification === "growth" || classification === "quality_compounder";
}

export function isFinancialModel(classification: CompanyClassification): boolean {
  return classification === "financial";
}
