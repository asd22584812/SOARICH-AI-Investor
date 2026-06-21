"use client";

import type { ValuationAnalysis } from "@/types/stock";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PriceRangeBarProps {
  valuation: ValuationAnalysis;
  currentPrice: number;
  currency: "TWD" | "USD";
}

export function PriceRangeBar({
  valuation,
  currentPrice,
  currency,
}: PriceRangeBarProps) {
  const min = valuation.safetyPrice * 0.85;
  const max = valuation.optimisticPrice * 1.05;
  const range = max - min;

  const toPercent = (price: number) =>
    Math.min(100, Math.max(0, ((price - min) / range) * 100));

  const markers = [
    { label: "安全價", price: valuation.safetyPrice, color: "bg-success" },
    { label: "合理價", price: valuation.fairPrice, color: "bg-brand" },
    { label: "樂觀價", price: valuation.optimisticPrice, color: "bg-blue-400" },
    { label: "DCF", price: valuation.dcfValue, color: "bg-purple-400" },
  ];

  const currentPct = toPercent(currentPrice);

  return (
    <div className="space-y-6">
      {/* Range bar */}
      <div className="relative pt-8 pb-2">
        <div className="relative h-2 rounded-full bg-bg-card-secondary overflow-visible">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-success/40 via-brand/40 to-blue-400/30"
            style={{ width: "100%" }}
          />
          {/* Current price marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-10"
            style={{ left: `${currentPct}%`, transform: "translate(-50%, -50%)" }}
          >
            <div className="flex flex-col items-center">
              <span className="mb-1 whitespace-nowrap rounded-md bg-text-primary px-2 py-0.5 text-[10px] font-semibold text-bg-primary">
                現價 {formatCurrency(currentPrice, currency)}
              </span>
              <div className="h-5 w-5 rounded-full border-2 border-text-primary bg-brand shadow-lg shadow-brand/30" />
            </div>
          </div>
        </div>

        {/* Marker labels */}
        <div className="relative mt-4 h-12">
          {markers.map((m) => (
            <div
              key={m.label}
              className="absolute flex flex-col items-center -translate-x-1/2"
              style={{ left: `${toPercent(m.price)}%` }}
            >
              <div className={cn("h-2 w-2 rounded-full", m.color)} />
              <span className="mt-1 text-[10px] text-text-secondary whitespace-nowrap">
                {m.label}
              </span>
              <span className="text-[11px] font-medium text-text-primary">
                {formatCurrency(m.price, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Margin of Safety */}
      <div className="flex items-center justify-between rounded-2xl bg-brand/8 border border-brand/15 px-4 py-3">
        <span className="text-sm text-text-secondary">Margin of Safety</span>
        <span className="text-xl font-semibold text-brand">
          {valuation.marginOfSafety.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
