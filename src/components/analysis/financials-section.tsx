import type { FinancialProfile } from "@/types/stock";
import { formatCompactNumber, formatMetric } from "@/lib/utils";

interface FinancialsSectionProps {
  financials: FinancialProfile;
}

export function FinancialsSection({ financials }: FinancialsSectionProps) {
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
      label: "EPS",
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
      label: "成長率",
      value: formatMetric(financials.growthRate, (v) => `${v.toFixed(1)}%`),
    },
    {
      label: "市值",
      value: formatCompactNumber(financials.marketCap),
    },
  ];

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">財務體質</h2>
        <div className="text-right">
          <span className="text-2xl font-bold text-brand">{financials.score}</span>
          <span className="text-sm text-text-secondary">/100</span>
        </div>
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
