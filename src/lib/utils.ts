import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: "TWD" | "USD" = "USD") {
  return new Intl.NumberFormat(currency === "TWD" ? "zh-TW" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "TWD" ? 0 : 2,
    maximumFractionDigits: currency === "TWD" ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
