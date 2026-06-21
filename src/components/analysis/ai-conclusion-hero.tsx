"use client";

import type { StockAnalysis } from "@/types/stock";
import { BUY_SIGNAL_CONFIG } from "@/lib/constants";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface AIConclusionHeroProps {
  analysis: StockAnalysis;
}

export function AIConclusionHero({ analysis }: AIConclusionHeroProps) {
  const signal = BUY_SIGNAL_CONFIG[analysis.buySignal];
  const { aiConclusion } = analysis;

  return (
    <section
      className={cn(
        "rounded-2xl border p-5",
        signal.bg,
        signal.border
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{signal.emoji}</span>
        <span className={cn("text-xl font-bold", signal.color)}>
          {signal.label}
        </span>
      </div>

      <p className="mt-3 text-base font-medium text-text-primary">
        目前股價低於合理價 {aiConclusion.undervaluedPercent}%
      </p>

      <ul className="mt-3 space-y-1.5">
        {aiConclusion.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="h-1 w-1 rounded-full bg-brand" />
            {h}
          </li>
        ))}
      </ul>
    </section>
  );
}
