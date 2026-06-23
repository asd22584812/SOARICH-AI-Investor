import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: "TWD" | "USD" = "USD") {
  if (currency === "TWD") {
    return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
  }
  return `US$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** UI display only — calculation layer keeps raw MOS. */
export function formatMarginOfSafetyDisplay(mos: number): string {
  if (mos >= 100) return ">100%";
  if (mos <= -100) return "<-100%";
  const sign = mos >= 0 ? "+" : "";
  return `${sign}${mos.toFixed(1)}%`;
}

export function formatMetric(
  value: number | null | undefined,
  formatter: (value: number) => string
): string {
  if (value == null || Number.isNaN(value)) return "N/A";
  return formatter(value);
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}
