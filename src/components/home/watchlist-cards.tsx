"use client";

import Link from "next/link";
import type { WatchlistItem } from "@/types/stock";
import { ENTRY_SIGNAL_CONFIG } from "@/lib/constants";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";
import { useMarketFilter } from "@/contexts/market-filter-context";

interface WatchlistCardsProps {
  items: WatchlistItem[];
  compact?: boolean;
  horizontal?: boolean;
}

export function WatchlistCards({
  items,
  compact,
  horizontal = false,
}: WatchlistCardsProps) {
  const { labels } = useMarketFilter();

  return (
    <section className="w-full overflow-hidden">
      <h2
        className={cn(
          "text-base font-semibold text-text-primary",
          compact ? "mb-2.5" : "mb-3"
        )}
      >
        {labels.watchlist}
        {!horizontal && items.length > 0 ? (
          <span className="ml-2 text-xs font-normal text-text-secondary">
            {items.length} 檔
          </span>
        ) : null}
      </h2>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          尚無熱門股票資料
        </p>
      ) : horizontal ? (
        <div className="carousel">
          {items.map((item) => (
            <WatchlistCard key={item.symbol} item={item} horizontal />
          ))}
        </div>
      ) : (
        <div className={cn(compact ? "space-y-2.5" : "space-y-3")}>
          {items.map((item) => (
            <WatchlistCard key={item.symbol} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function WatchlistCard({
  item,
  horizontal = false,
}: {
  item: WatchlistItem;
  horizontal?: boolean;
}) {
  const positive = item.changePercent >= 0;
  const signal = ENTRY_SIGNAL_CONFIG[item.entrySignal];

  return (
    <Link
      href={`/analysis?symbol=${item.symbol}`}
      className={cn(
        "watchlist-card card-glass block rounded-2xl p-4",
        horizontal && "min-w-[260px] shrink-0"
      )}
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
            <p className="text-[10px] text-text-secondary">綜合評級</p>
            <p className="text-sm font-bold text-brand">{item.aiScore}</p>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${signal.bg} ${signal.border} ${signal.color}`}
          >
            <span>{signal.emoji}</span>
            <span className="max-w-[88px] truncate">{item.entryLabel}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
