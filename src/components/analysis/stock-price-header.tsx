"use client";

import type { StockQuote } from "@/types/stock";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface StockPriceHeaderProps {
  stock: StockQuote;
}

export function StockPriceHeader({ stock }: StockPriceHeaderProps) {
  const positive = stock.changePercent >= 0;

  return (
    <header className="pt-2">
      <p className="text-sm text-text-secondary">{stock.name}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <h1 className="text-lg font-medium text-text-secondary">{stock.symbol}</h1>
        <span className="rounded-md bg-bg-card-secondary px-1.5 py-0.5 text-[10px] text-text-secondary">
          {stock.market === "TW" ? "台股" : "美股"}
        </span>
      </div>

      <p className="mt-3 text-[2.5rem] font-semibold leading-none tracking-tight text-text-primary">
        {formatCurrency(stock.price, stock.currency)}
      </p>
      <p
        className={cn(
          "mt-2 text-base font-medium",
          positive ? "text-success" : "text-danger"
        )}
      >
        {positive ? "+" : ""}
        {formatCurrency(stock.change, stock.currency)} ({formatPercent(stock.changePercent)}) 今日
      </p>
    </header>
  );
}
