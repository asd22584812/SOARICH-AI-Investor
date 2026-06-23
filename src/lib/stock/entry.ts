import type { FcfPerShareSource } from "./normalizer";
import type { AnalysisEntrySignal, EntrySignalResult } from "./types";

export type ValuationConfidence = "high" | "medium" | "low";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveValuationConfidence(
  fcfPerShareSource: FcfPerShareSource
): ValuationConfidence {
  if (fcfPerShareSource === "eps_estimate") return "low";
  if (fcfPerShareSource === "operating_cashflow") return "medium";
  return "high";
}

export function calculateEntryScore(input: {
  marginOfSafety: number;
  valuationScore: number;
  insufficientData: boolean;
  peUnreliable: boolean;
  peHighRisk: boolean;
  valuationConfidence: ValuationConfidence;
}): number {
  if (input.insufficientData) return 0;

  const mos = input.marginOfSafety;
  let mosPoints = 0;
  if (mos >= 30) mosPoints = 40;
  else if (mos >= 15) mosPoints = 32;
  else if (mos >= 0) mosPoints = 22;
  else if (mos >= -15) mosPoints = 10;

  let reliability = 10;
  if (input.peUnreliable) reliability -= 4;
  if (input.peHighRisk) reliability -= 2;
  if (input.valuationConfidence === "low") reliability -= 4;
  else if (input.valuationConfidence === "medium") reliability -= 2;

  const belowFairValuePoints = mos > 0 ? 15 : 0;
  const valuationPoints = (input.valuationScore / 100) * 35;

  return clampScore(
    mosPoints + valuationPoints + belowFairValuePoints + Math.max(0, reliability)
  );
}

export function getEntryLabel(input: {
  marginOfSafety: number;
  soarichRating: number;
  insufficientData: boolean;
}): string {
  if (input.insufficientData) return "資料不足，暫不評級";

  const { marginOfSafety: mos, soarichRating: rating } = input;

  if (mos >= 30 && rating >= 80) return "深度低估，值得深入研究";
  if (mos >= 15 && rating >= 75) return "具安全邊際";
  if (mos >= 0 && rating >= 70) return "接近合理價";
  if (mos < 0 && rating >= 80) return "好公司，但價格偏高";
  return "暫不具吸引力";
}

export function isRadarEligible(input: {
  soarichRating: number;
  marginOfSafety: number;
  valuationScore: number;
  insufficientData: boolean;
}): boolean {
  return (
    !input.insufficientData &&
    input.soarichRating >= 75 &&
    input.marginOfSafety >= 0 &&
    input.valuationScore >= 65
  );
}

export function isUndervaluedFocusEligible(input: {
  soarichRating: number;
  marginOfSafety: number;
  valuationScore: number;
  insufficientData: boolean;
}): boolean {
  return (
    !input.insufficientData &&
    input.marginOfSafety > 0 &&
    input.soarichRating >= 70 &&
    input.valuationScore >= 65
  );
}

export function isHighQualityWatchEligible(input: {
  soarichRating: number;
  moatScore: number;
  financialScore: number;
  insufficientData: boolean;
}): boolean {
  return (
    !input.insufficientData &&
    input.soarichRating >= 80 &&
    input.moatScore >= 75 &&
    input.financialScore >= 70
  );
}

export function mapEntryLabelToSignal(entryLabel: string): EntrySignalResult {
  let signal: AnalysisEntrySignal = "AVOID";

  switch (entryLabel) {
    case "深度低估，值得深入研究":
      signal = "STRONG_WATCH";
      break;
    case "具安全邊際":
      signal = "WATCH";
      break;
    case "接近合理價":
      signal = "WATCH";
      break;
    case "好公司，但價格偏高":
      signal = "CAUTIOUS";
      break;
    default:
      signal = "AVOID";
      break;
  }

  return { signal, label: entryLabel };
}
