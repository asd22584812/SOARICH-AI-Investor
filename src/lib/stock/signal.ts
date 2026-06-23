import type { EntrySignal } from "@/types/stock";
import type { AnalysisEntrySignal, EntrySignalResult } from "./types";

/** 首頁精選最低綜合評級 */
export const RECOMMENDATION_MIN_SCORE = 80;

export function getEntrySignalFromScore(totalScore: number): EntrySignalResult {
  const score = Math.max(0, Math.min(100, Math.round(totalScore)));

  if (score >= 90) {
    return { signal: "STRONG_WATCH", label: "深度關注" };
  }
  if (score >= 80) {
    return { signal: "WATCH", label: "值得關注" };
  }
  if (score >= 70) {
    return { signal: "WATCH", label: "觀察" };
  }
  if (score >= 60) {
    return { signal: "CAUTIOUS", label: "謹慎" };
  }
  return { signal: "AVOID", label: "避免" };
}

export function mapAnalysisEntrySignalToUI(
  signal: AnalysisEntrySignal
): EntrySignal {
  switch (signal) {
    case "STRONG_WATCH":
      return "strong_watch";
    case "WATCH":
      return "watch";
    case "CAUTIOUS":
      return "cautious";
    case "AVOID":
      return "avoid";
  }
}

/** @deprecated Use isUndervaluedFocusEligible on analysis result */
export function isHomeRecommendation(
  _totalScore: number,
  radarEligible = false
): boolean {
  return radarEligible;
}

export function isHomeRecommendationSignal(signal: EntrySignal): boolean {
  return signal === "strong_watch" || signal === "watch";
}
