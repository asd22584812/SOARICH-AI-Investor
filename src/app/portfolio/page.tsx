import { MOCK_PORTFOLIO } from "@/data/mock-data";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { PerformanceRanking } from "@/components/portfolio/performance-ranking";

export default function PortfolioPage() {
  const p = MOCK_PORTFOLIO;
  const positiveDaily = p.dailyPnL >= 0;
  const positiveTotal = p.totalReturn >= 0;

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-lg font-semibold text-text-primary">投資組合</h1>
      </header>

      {/* Hero summary */}
      <section className="glass-card-elevated rounded-3xl p-5">
        <p className="text-sm text-text-secondary">總資產</p>
        <p className="mt-1 text-[2rem] font-semibold tracking-tight text-text-primary">
          {formatCurrency(p.totalAssets, p.currency)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-secondary">總報酬</p>
            <p
              className={cn(
                "mt-0.5 text-base font-semibold",
                positiveTotal ? "text-success" : "text-danger"
              )}
            >
              {positiveTotal ? "+" : ""}
              {formatCurrency(p.totalReturn, p.currency)}
            </p>
            <p
              className={cn(
                "text-xs",
                positiveTotal ? "text-success/80" : "text-danger/80"
              )}
            >
              {formatPercent(p.totalReturnPercent)}
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
              {formatCurrency(p.dailyPnL, p.currency)}
            </p>
            <p
              className={cn(
                "text-xs",
                positiveDaily ? "text-success/80" : "text-danger/80"
              )}
            >
              {formatPercent(p.dailyPnLPercent)}
            </p>
          </div>
        </div>
      </section>

      <AllocationChart title="持股比例" data={p.holdings.map((h) => ({
        name: h.symbol,
        value: h.weight,
        color: h.market === "TW" ? "#C8A85D" : "#22C55E",
      }))} />

      <AllocationChart title="產業比例" data={p.byIndustry} />

      <AllocationChart title="國家比例" data={p.byCountry} />

      <PerformanceRanking holdings={p.holdings} currency={p.currency} />
    </div>
  );
}
