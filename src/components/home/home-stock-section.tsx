"use client";

import Link from "next/link";
import type { HomeStockCard } from "@/types/stock";
import { ENTRY_SIGNAL_CONFIG } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface HomeStockSectionProps {
  title: string;
  subtitle?: string | null;
  items: HomeStockCard[];
  compact?: boolean;
  showUndervaluedBadge?: boolean;
}

export function HomeStockSection({
  title,
  subtitle,
  items,
  compact,
  showUndervaluedBadge = false,
}: HomeStockSectionProps) {
  return (
    <section className="w-full max-w-full overflow-hidden">
      <div className={cn("flex items-center gap-2", compact ? "mb-2.5" : "mb-3")}>
        <Sparkles className="h-4 w-4 shrink-0 text-brand" />
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {subtitle ? (
          <span className="text-xs text-text-secondary">{subtitle}</span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          此市場暫無符合條件的股票
        </p>
      ) : (
        <div className="carousel">
          {items.map((item) => {
            const signal = ENTRY_SIGNAL_CONFIG[item.entrySignal];
            return (
              <Link
                key={item.symbol}
                href={`/analysis?symbol=${item.symbol}`}
                className="recommend-card card-glass"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold leading-snug text-text-primary">
                      {item.name}
                    </p>
                    <p className="text-xs text-text-secondary">{item.symbol}</p>
                  </div>
                  <div className="shrink-0 rounded-xl bg-brand/10 px-2.5 py-1 text-center">
                    <p className="text-[10px] text-text-secondary">綜合評級</p>
                    <p className="text-base font-bold text-brand">{item.score}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-text-secondary">現價</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatCurrency(item.price, item.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary">合理價</p>
                    <p className="text-sm font-semibold text-brand">
                      {formatCurrency(item.fairPrice, item.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {showUndervaluedBadge && item.undervaluedPercent > 0 ? (
                    <span className="rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success">
                      低估 {item.undervaluedPercent}%
                    </span>
                  ) : (
                    <span className="text-xs text-text-secondary">{item.entryLabel}</span>
                  )}
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${signal.bg} ${signal.border} ${signal.color}`}
                  >
                    <span>{signal.emoji}</span>
                    <span>{item.entryLabel}</span>
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
