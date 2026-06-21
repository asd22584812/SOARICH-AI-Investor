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
    <section className="glass-card rounded-2xl p-5">
      <h2 className="mb-5 text-base font-semibold text-text-primary">合理價分析</h2>
      <PriceRangeBar
        valuation={valuation}
        currentPrice={currentPrice}
        currency={currency}
      />
    </section>
  );
}
