import type { BuySignal } from "@/types/stock";
import type { AnalysisBuySignal, BuySignalResult } from "./types";

/** 首頁精選最低綜合評級 */
export const RECOMMENDATION_MIN_SCORE = 80;

export function getBuySignalFromScore(totalScore: number): BuySignalResult {
  const score = Math.max(0, Math.min(100, Math.round(totalScore)));

  if (score >= 90) {
    return { signal: "STRONG_BUY", label: "強烈買入" };
  }
  if (score >= 80) {
    return { signal: "BUY", label: "適合買入" };
  }
  if (score >= 70) {
    return { signal: "WATCH", label: "觀察" };
  }
  if (score >= 60) {
    return { signal: "CAUTIOUS", label: "謹慎" };
  }
  return { signal: "AVOID", label: "避免" };
}

export function mapAnalysisSignalToUI(signal: AnalysisBuySignal): BuySignal {
  switch (signal) {
    case "STRONG_BUY":
      return "strongly_undervalued";
    case "BUY":
      return "good_buy";
    case "WATCH":
      return "watch";
    case "CAUTIOUS":
      return "overvalued";
    case "AVOID":
      return "avoid";
  }
}

export function isHomeRecommendation(totalScore: number): boolean {
  return totalScore >= RECOMMENDATION_MIN_SCORE;
}

export function isHomeRecommendationSignal(signal: BuySignal): boolean {
  return signal === "strongly_undervalued" || signal === "good_buy";
}

/** @deprecated Use getBuySignalFromScore(totalScore) */
export function getBuySignal(marginOfSafety: number): BuySignalResult {
  return getBuySignalFromScore(
    marginOfSafety >= 30 ? 92 : marginOfSafety >= 15 ? 85 : marginOfSafety >= -10 ? 75 : marginOfSafety >= -25 ? 65 : 50
  );
}
