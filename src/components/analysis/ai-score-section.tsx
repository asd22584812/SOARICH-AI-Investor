import type { AIScoreBreakdown } from "@/types/stock";
import { SCORE_LABELS } from "@/lib/constants";
import { ScoreGauge } from "@/components/charts/score-gauge";

interface AIScoreSectionProps {
  totalScore: number;
  scores: AIScoreBreakdown;
}

export function AIScoreSection({ totalScore, scores }: AIScoreSectionProps) {
  const items = Object.entries(scores) as [keyof AIScoreBreakdown, number][];

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">綜合評級</h2>
      </div>
      <div className="mt-2 flex flex-col items-center">
        <ScoreGauge score={totalScore} label="綜合評級" />
      </div>
      <div className="mt-6 space-y-3.5">
        {items.map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 text-xs text-text-secondary">
              {SCORE_LABELS[key]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-card-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand/70 to-brand transition-all duration-500"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-semibold text-text-primary">
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
