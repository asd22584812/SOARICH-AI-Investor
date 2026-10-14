import type { ValuationAnalysis } from "@/types/stock";
import { cn, formatMarginOfSafetyDisplay } from "@/lib/utils";

interface MarginOfSafetySectionProps {
  valuation: ValuationAnalysis;
}

export function MarginOfSafetySection({ valuation }: MarginOfSafetySectionProps) {
  if (valuation.fairPrice == null || valuation.safetyPrice == null || valuation.optimisticPrice == null || valuation.marginOfSafety == null) {
    return <p className="p-4 text-sm text-text-secondary">資料不足或幣別／商品類型不適用，暫不提供合理價與安全邊際。</p>;
  }
  const positive = valuation.marginOfSafety >= 0;
  const displayMos = formatMarginOfSafetyDisplay(valuation.marginOfSafety);
  const extremelyOvervalued = valuation.marginOfSafety <= -100;

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Margin of Safety</h2>
          <p className="mt-1 text-xs text-text-secondary">安全邊際（合理價 vs 現價）</p>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-right",
            positive ? "bg-success/10" : "bg-danger/10"
          )}
        >
          <p
            className={cn(
              "text-3xl font-black tracking-tight",
              positive ? "text-success" : "text-danger"
            )}
          >
            {displayMos}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        {positive
          ? "目前股價低於合理價，具備一定安全邊際。"
          : extremelyOvervalued
            ? "目前股價極度高估，遠高於合理價，需高度留意估值風險。"
            : "目前股價高於合理價，安全邊際為負，需留意估值風險。"}
      </p>
    </section>
  );
}
