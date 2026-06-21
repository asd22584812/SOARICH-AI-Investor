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
  const min = valuation.safetyPrice * 0.9;
  const max = valuation.optimisticPrice * 1.08;
  const range = max - min;

  const toPercent = (price: number) =>
    Math.min(100, Math.max(0, ((price - min) / range) * 100));

  const markers = [
    { label: "安全價", price: valuation.safetyPrice, color: "bg-success" },
    { label: "合理價", price: valuation.fairPrice, color: "bg-brand" },
    { label: "樂觀價", price: valuation.optimisticPrice, color: "bg-sky-400" },
  ];

  const currentPct = toPercent(currentPrice);

  return (
    <div className="space-y-2">
      <div className="relative pt-10 pb-2">
        <div className="relative h-3 overflow-visible rounded-full bg-bg-card-secondary">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-success/35 via-brand/35 to-sky-400/30" />

          {markers.map((marker) => (
            <div
              key={marker.label}
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-white/30"
              style={{ left: `${toPercent(marker.price)}%` }}
            />
          ))}

          <div
            className="absolute top-1/2 z-10 -translate-y-1/2"
            style={{ left: `${currentPct}%` }}
          >
            <div className="-translate-x-1/2">
              <div className="mb-1 flex justify-center">
                <span className="whitespace-nowrap rounded-lg bg-text-primary px-2.5 py-1 text-[10px] font-bold text-bg-primary shadow-lg">
                  現價 {formatCurrency(currentPrice, currency)}
                </span>
              </div>
              <div className="mx-auto h-5 w-5 rounded-full border-[3px] border-text-primary bg-brand shadow-[0_0_20px_rgba(200,168,93,0.55)]" />
            </div>
          </div>
        </div>

        <div className="relative mt-5 h-14">
          {markers.map((marker) => (
            <div
              key={marker.label}
              className="absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${toPercent(marker.price)}%` }}
            >
              <div className={cn("h-2.5 w-2.5 rounded-full", marker.color)} />
              <span className="mt-1 text-[10px] text-text-secondary">{marker.label}</span>
              <span className="text-[11px] font-semibold text-text-primary">
                {formatCurrency(marker.price, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
