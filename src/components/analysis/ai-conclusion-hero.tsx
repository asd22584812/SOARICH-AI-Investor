"use client";

import type { StockAnalysis } from "@/types/stock";
import { BUY_SIGNAL_CONFIG } from "@/lib/constants";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIConclusionHeroProps {
  analysis: StockAnalysis;
}

export function AIConclusionHero({ analysis }: AIConclusionHeroProps) {
  const signal = BUY_SIGNAL_CONFIG[analysis.buySignal];
  const { aiConclusion } = analysis;

  return (
    <section className="analysis-conclusion-card glass-card-elevated rounded-3xl border border-brand/15 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <h2 className="text-base font-semibold text-text-primary">AI 投資結論</h2>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-primary">
        {aiConclusion.summary}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            signal.bg,
            signal.color
          )}
        >
          {signal.emoji} {signal.label}
        </span>
        {aiConclusion.suitableForDCA && (
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            適合分批布局
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-brand">亮點</p>
          <ul className="mt-2 space-y-1.5">
            {aiConclusion.highlights.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-warning">主要風險</p>
          <ul className="mt-2 space-y-1.5">
            {aiConclusion.mainRisks.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 rounded-2xl bg-bg-card-secondary/80 px-4 py-3 text-sm leading-relaxed text-text-secondary">
        {aiConclusion.growthOutlook}
      </p>
    </section>
  );
}
