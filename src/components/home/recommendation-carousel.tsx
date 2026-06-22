"use client";

import Link from "next/link";
import type { AIRecommendation } from "@/types/stock";
import { BUY_SIGNAL_CONFIG } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface RecommendationCarouselProps {
  recommendations: AIRecommendation[];
  compact?: boolean;
}

export function RecommendationCarousel({
  recommendations,
  compact,
}: RecommendationCarouselProps) {
  return (
    <section className="w-full max-w-full overflow-hidden">
      <div className={cn("flex items-center gap-2", compact ? "mb-2.5" : "mb-3")}>
        <Sparkles className="h-4 w-4 shrink-0 text-brand" />
        <h2 className="text-base font-semibold text-text-primary">今日精選</h2>
      </div>

      {recommendations.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          此市場暫無推薦股票
        </p>
      ) : (
      <div className="carousel">
        {recommendations.map((rec) => {
          const signal = BUY_SIGNAL_CONFIG[rec.buySignal];
          return (
            <Link
              key={rec.symbol}
              href={`/analysis?symbol=${rec.symbol}`}
              className="recommend-card card-glass"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-snug text-text-primary">
                    {rec.name}
                  </p>
                  <p className="text-xs text-text-secondary">{rec.symbol}</p>
                </div>
                <div className="shrink-0 rounded-xl bg-brand/10 px-2.5 py-1 text-center">
                  <p className="text-[10px] text-text-secondary">綜合評級</p>
                  <p className="text-base font-bold text-brand">{rec.score}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-text-secondary">現價</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(rec.price, rec.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary">合理價</p>
                  <p className="text-sm font-semibold text-brand">
                    {formatCurrency(rec.fairPrice, rec.currency)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  低估 {rec.undervaluedPercent}%
                </span>
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${signal.bg} ${signal.border} ${signal.color}`}
                >
                  <span>{signal.emoji}</span>
                  <span>{signal.label}</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </section>
  );
}
