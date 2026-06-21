"use client";

import type { StockQuote } from "@/types/stock";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface StockPriceHeaderProps {
  stock: StockQuote;
}

export function StockPriceHeader({ stock }: StockPriceHeaderProps) {
  const positive = stock.changePercent >= 0;

  return (
    <section className="analysis-hero-card glass-card-elevated rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-secondary">
            {stock.market === "TW" ? "台股" : "美股"}
          </p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-text-primary">
            {stock.name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{stock.symbol}</p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-brand/10 px-3 py-2 text-center">
          <p className="text-[10px] text-text-secondary">即時報價</p>
          <p className="text-xs font-semibold text-brand">LIVE</p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-5">
        <p className="text-[2.35rem] font-semibold leading-none tracking-tight text-text-primary">
          {formatCurrency(stock.price, stock.currency)}
        </p>
        <p
          className={cn(
            "mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            positive
              ? "bg-success/12 text-success"
              : "bg-danger/12 text-danger"
          )}
        >
          {positive ? "+" : ""}
          {formatCurrency(stock.change, stock.currency)} ({formatPercent(stock.changePercent)})
        </p>
      </div>
    </section>
  );
}
