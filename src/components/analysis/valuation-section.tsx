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
        安全價 · 合理價 · 樂觀價與目前股價落點
      </p>
      {valuation.valuationConfidence === "low" ? (
        <p className="mb-4 text-xs text-text-secondary">現金流資料為估算</p>
      ) : null}
      <PriceRangeBar
        valuation={valuation}
        currentPrice={currentPrice}
        currency={currency}
      />
    </section>
  );
}
