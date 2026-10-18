import type { FinancialProfile } from "@/types/stock";
import { formatCompactNumber, formatMetric } from "@/lib/utils";

interface FinancialsSectionProps {
  financials: Omit<FinancialProfile, "score">;
  currency: string;
  financialCurrency: string | null;
}

export function FinancialsSection({ financials, currency, financialCurrency }: FinancialsSectionProps) {
  const metrics = [
    {
      label: "ROE",
      value: formatMetric(financials.roe, (v) => `${v.toFixed(1)}%`),
    },
    {
      label: "ROA",
      value: formatMetric(financials.roa, (v) => `${v.toFixed(1)}%`),
    },
    {
      label: "毛利率",
      value: formatMetric(financials.grossMargin, (v) => `${v.toFixed(1)}%`),
    },
    {
      label: "營業利益率",
      value: formatMetric(financials.operatingMargin, (v) => `${v.toFixed(1)}%`),
    },
    {
      label: "負債權益比",
      value: formatMetric(financials.debtToEquity, (v) => v.toFixed(2)),
    },
    {
      label: `EPS（${financialCurrency ?? "幣別未確認"}）`,
      value: formatMetric(financials.eps, (v) => v.toFixed(2)),
    },
    {
      label: "本益比",
      value: formatMetric(financials.pe, (v) => v.toFixed(1)),
    },
    {
      label: "股價淨值比",
      value: formatMetric(financials.pb, (v) => v.toFixed(1)),
    },
    {
      label: "營收成長率（期間待核對）",
      value: formatMetric(financials.growthRate, (v) => `${v.toFixed(1)}%`),
    },
    {
      label: `市值（${currency}）`,
      value: formatCompactNumber(financials.marketCap),
    },
  ];

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">來源財務指標（待核對）</h2>

      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-white/[0.05] bg-bg-card-secondary/80 px-3 py-3 text-center"
          >
            <p className="text-[10px] text-text-secondary">{metric.label}</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
