import type { ValuationAnalysis } from "@/types/stock";
import { PriceRangeBar } from "@/components/charts/price-range-bar";

interface ValuationSectionProps {
  valuation: ValuationAnalysis;
  currentPrice: number;
  currency: "TWD" | "USD";
}

export function ValuationSection({
  valuation,
  currentPrice,
  currency,
}: ValuationSectionProps) {
  return (
    <section className="glass-card rounded-3xl p-5">
      <h2 className="mb-1 text-base font-semibold text-text-primary">合理價區間</h2>
      <p className="mb-5 text-xs text-text-secondary">
        模型估值：安全價為合理價 80%，樂觀情境為 125%；並非保證報酬。
      </p>
      {valuation.valuationModel ? (
        <p className="mb-3 text-xs text-text-secondary">
          估值模型：{valuation.valuationModel}
        </p>
      ) : null}
      {valuation.valuationConfidence === "low" ? (
        <p className="mb-4 text-xs text-text-secondary">現金流資料不足，估值可信度偏低</p>
      ) : null}
      <p className="mb-4 text-xs text-text-secondary">DCF 假設折現率 10%、前五年成長率採營收成長並設上下限、永續成長率 2.5%。{valuation.valuationModel}</p>
      <PriceRangeBar
        valuation={valuation}
        currentPrice={currentPrice}
        currency={currency}
      />
    </section>
  );
}
