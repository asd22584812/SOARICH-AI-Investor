import type { CompanyClassification } from "./normalizer";
import type { ValuationWeights } from "./valuation";

const WEIGHT_LABELS: Record<keyof ValuationWeights, string> = {
  dcf: "DCF",
  pe: "PE",
  peg: "PEG",
  pb: "PB",
  fcfMultiple: "FCF Multiple",
  roeQuality: "ROE Quality",
  dividendBook: "Book Value",
};

export function describeValuationModel(
  classification: CompanyClassification,
  weights: ValuationWeights
): string {
  if (classification === "financial") {
    const parts: string[] = [];
    if (weights.pb > 0) {
      parts.push(`PB (${Math.round(weights.pb * 100)}%)`);
    }
    if (weights.roeQuality > 0) {
      parts.push(`ROE (${Math.round(weights.roeQuality * 100)}%)`);
    }
    if (weights.dividendBook > 0) {
      parts.push(`Book Value (${Math.round(weights.dividendBook * 100)}%)`);
    }
    if (weights.pe > 0) {
      parts.push(`PE (${Math.round(weights.pe * 100)}%)`);
    }
    return `Financial: ${parts.join(" + ") || "PB + ROE + Book Value"}`;
  }

  const parts = (Object.keys(weights) as (keyof ValuationWeights)[])
    .filter((key) => weights[key] > 0.01)
    .sort((a, b) => weights[b] - weights[a])
    .map((key) => `${WEIGHT_LABELS[key]} (${Math.round(weights[key] * 100)}%)`);

  return parts.join(" + ") || "Blended";
}

export function usesForbiddenFinancialModels(
  classification: CompanyClassification,
  weights: ValuationWeights
): boolean {
  if (classification !== "financial") return false;
  return weights.dcf > 0.01 || weights.peg > 0.01;
}
