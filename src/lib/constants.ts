import type { BuySignal, RiskLevel } from "@/types/stock";

export const BUY_SIGNAL_CONFIG: Record<
  BuySignal,
  { label: string; emoji: string; color: string; bg: string; border: string }
> = {
  strongly_undervalued: {
    label: "強烈買入",
    emoji: "🟢",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/25",
  },
  good_buy: {
    label: "適合買入",
    emoji: "🟢",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/25",
  },
  watch: {
    label: "觀察",
    emoji: "🟡",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/25",
  },
  overvalued: {
    label: "謹慎",
    emoji: "🟠",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
  },
  avoid: {
    label: "避免",
    emoji: "🔴",
    color: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/25",
  },
};

export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; icon: string }
> = {
  low: { label: "低", color: "text-success", bg: "bg-success/15", icon: "🛡️" },
  medium: { label: "中", color: "text-warning", bg: "bg-warning/15", icon: "⚠️" },
  high: { label: "高", color: "text-danger", bg: "bg-danger/15", icon: "🔴" },
};

export const SCORE_LABELS: Record<string, string> = {
  moat: "護城河",
  financials: "財務",
  growth: "成長",
  management: "管理層",
  valuation: "估值",
};

export const MOAT_RADAR_LABELS: Record<string, string> = {
  brand: "品牌",
  technology: "技術壁壘",
  scaleEconomy: "規模經濟",
  switchingCost: "轉換成本",
  networkEffect: "網路效應",
};

export const CHART_RANGES = ["1D", "1W", "1M", "3M", "1Y", "5Y", "ALL"] as const;
