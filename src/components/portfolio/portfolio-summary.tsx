"use client";

import type { ComputedPortfolio } from "@/types/stock";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface PortfolioSummaryProps {
  portfolio: ComputedPortfolio;
}

export function PortfolioSummary({ portfolio }: PortfolioSummaryProps) {
  const twd = portfolio.totalsByCurrency.TWD;
  const usd = portfolio.totalsByCurrency.USD;

  return (
    <section className="glass-card-elevated rounded-3xl p-5">
      {twd && <CurrencySummary currency="TWD" totals={twd} />}
      {usd && (
        <div className={twd ? "mt-5 border-t border-white/[0.06] pt-5" : ""}>
          <CurrencySummary currency="USD" totals={usd} />
        </div>
      )}

      {portfolio.hasMixedCurrency && (
        <p className="mt-4 text-[11px] leading-relaxed text-text-secondary/80">
          配置圖表以台幣等值加總計算（美元持股 × 32）。
        </p>
      )}
    </section>
  );
}

function CurrencySummary({
  currency,
  totals,
}: {
  currency: "TWD" | "USD";
  totals: NonNullable<ComputedPortfolio["totalsByCurrency"]["TWD"]>;
}) {
  const positiveReturn = totals.unrealizedPnL >= 0;
  const positiveDaily = totals.dailyPnL >= 0;

  return (
    <div>
      <p className="text-sm text-text-secondary">
        總資產 {currency === "TWD" ? "（台幣）" : "（美元）"}
      </p>
      <p className="mt-1 text-[2rem] font-semibold tracking-tight text-text-primary">
        {formatCurrency(totals.totalAssets, currency)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-text-secondary">未實現損益</p>
          <p
            className={cn(
              "mt-0.5 text-base font-semibold",
              positiveReturn ? "text-success" : "text-danger"
            )}
          >
            {positiveReturn ? "+" : ""}
            {formatCurrency(totals.unrealizedPnL, currency)}
          </p>
          <p
            className={cn(
              "text-xs",
              positiveReturn ? "text-success/80" : "text-danger/80"
            )}
          >
            {formatPercent(totals.returnPercent)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">今日損益</p>
          <p
            className={cn(
              "mt-0.5 text-base font-semibold",
              positiveDaily ? "text-success" : "text-danger"
            )}
          >
            {positiveDaily ? "+" : ""}
            {formatCurrency(totals.dailyPnL, currency)}
          </p>
          <p
            className={cn(
              "text-xs",
              positiveDaily ? "text-success/80" : "text-danger/80"
            )}
          >
            {formatPercent(totals.dailyPnLPercent)}
          </p>
        </div>
      </div>
    </div>
  );
}
