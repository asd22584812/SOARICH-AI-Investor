"use client";

import Link from "next/link";
import type { WatchlistItem } from "@/types/stock";
import { BUY_SIGNAL_CONFIG } from "@/lib/constants";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";

interface WatchlistCardsProps {
  items: WatchlistItem[];
}

export function WatchlistCards({ items }: WatchlistCardsProps) {
  return (
    <section className="w-full overflow-hidden">
      <h2 className="mb-3 text-base font-semibold text-text-primary">自選股</h2>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">尚無自選股</p>
        ) : (
          items.map((item) => (
            <WatchlistCard key={item.symbol} item={item} />
          ))
        )}
      </div>
    </section>
  );
}

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const positive = item.changePercent >= 0;
  const signal = BUY_SIGNAL_CONFIG[item.buySignal];

  return (
    <Link
      href={`/analysis?symbol=${item.symbol}`}
      className="watchlist-card card-glass block rounded-2xl p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-primary">{item.name}</p>
          <p className="text-xs text-text-secondary">{item.symbol}</p>
        </div>
        <div className="h-9 w-16 shrink-0">
          <Sparkline data={item.sparkline} positive={positive} height={36} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-text-primary">
            {formatCurrency(item.price, item.currency)}
          </p>
          <p
            className={cn(
              "text-xs font-medium",
              positive ? "text-success" : "text-danger"
            )}
          >
            {formatPercent(item.changePercent)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-text-secondary">AI Score</p>
            <p className="text-sm font-bold text-brand">{item.aiScore}</p>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${signal.bg} ${signal.border} ${signal.color}`}
          >
            <span>{signal.emoji}</span>
            <span>{item.buySignal === "good_buy" ? "買入" : signal.label}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
