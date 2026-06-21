import type { BuySignalResult } from "./types";

export function getBuySignal(marginOfSafety: number): BuySignalResult {
  if (marginOfSafety >= 30) {
    return { signal: "STRONG_UNDERVALUED", label: "強烈低估" };
  }
  if (marginOfSafety >= 15) {
    return { signal: "BUY", label: "適合買入" };
  }
  if (marginOfSafety >= -10) {
    return { signal: "WATCH", label: "可觀察" };
  }
  if (marginOfSafety >= -25) {
    return { signal: "OVERVALUED", label: "偏高估" };
  }
  return { signal: "AVOID", label: "不建議買入" };
}
