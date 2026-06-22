"use client";

import type { PortfolioHolding } from "@/types/stock";
import { formatCurrency, cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface HoldingsListProps {
  holdings: PortfolioHolding[];
  onEdit: (holding: PortfolioHolding) => void;
  onDelete: (id: string) => void;
}

export function HoldingsList({ holdings, onEdit, onDelete }: HoldingsListProps) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">持股明細</h3>
      <div className="space-y-3">
        {holdings.map((holding) => {
          const positive = holding.returnPercent >= 0;
          return (
            <div
              key={holding.id}
              className="rounded-2xl border border-white/[0.05] bg-bg-card-secondary/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{holding.symbol}</p>
                  <p className="truncate text-xs text-text-secondary">{holding.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {holding.shares} 股 · 成本 {formatCurrency(holding.avgCost, holding.currency)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(holding)}
                    className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-card hover:text-brand"
                    aria-label="編輯持股"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(holding.id)}
                    className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-card hover:text-danger"
                    aria-label="刪除持股"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between border-t border-white/[0.05] pt-3">
                <div>
                  <p className="text-xs text-text-secondary">市值</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(holding.marketValue, holding.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">未實現損益</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      positive ? "text-success" : "text-danger"
                    )}
                  >
                    {positive ? "+" : ""}
                    {formatCurrency(holding.unrealizedPnL, holding.currency)} (
                    {positive ? "+" : ""}
                    {holding.returnPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
