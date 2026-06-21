import type { PortfolioHolding } from "@/types/stock";
import { formatCurrency, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PerformanceRankingProps {
  holdings: PortfolioHolding[];
  currency: "TWD" | "USD";
}

export function PerformanceRanking({
  holdings,
  currency,
}: PerformanceRankingProps) {
  const sorted = [...holdings].sort(
    (a, b) => b.returnPercent - a.returnPercent
  );
  const winners = sorted.filter((h) => h.returnPercent >= 0);
  const losers = sorted.filter((h) => h.returnPercent < 0).reverse();

  return (
    <div className="space-y-4">
      <RankingList
        title="獲利排行"
        icon={<TrendingUp className="h-4 w-4 text-success" />}
        holdings={winners}
        currency={currency}
      />
      {losers.length > 0 && (
        <RankingList
          title="虧損排行"
          icon={<TrendingDown className="h-4 w-4 text-danger" />}
          holdings={losers}
          currency={currency}
        />
      )}
    </div>
  );
}

function RankingList({
  title,
  icon,
  holdings,
  currency,
}: {
  title: string;
  icon: React.ReactNode;
  holdings: PortfolioHolding[];
  currency: "TWD" | "USD";
}) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="space-y-2">
        {holdings.map((h, i) => {
          const positive = h.returnPercent >= 0;
          const marketValue = h.shares * h.currentPrice;
          return (
            <div
              key={h.symbol}
              className="flex items-center gap-3 rounded-xl bg-bg-card-secondary p-3"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-card text-xs font-bold text-text-secondary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary">{h.symbol}</p>
                <p className="text-xs text-text-secondary">{h.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-text-primary">
                  {formatCurrency(marketValue, currency)}
                </p>
                <p
                  className={cn(
                    "text-xs font-semibold",
                    positive ? "text-success" : "text-danger"
                  )}
                >
                  {positive ? "+" : ""}
                  {h.returnPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
