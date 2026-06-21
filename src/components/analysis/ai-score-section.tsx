import type { AIScoreBreakdown } from "@/types/stock";
import { SCORE_LABELS } from "@/lib/constants";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { BUY_SIGNAL_CONFIG } from "@/lib/constants";
import type { BuySignal } from "@/types/stock";

interface AIScoreSectionProps {
  totalScore: number;
  scores: AIScoreBreakdown;
  buySignal: BuySignal;
}

export function AIScoreSection({
  totalScore,
  scores,
  buySignal,
}: AIScoreSectionProps) {
  const signalLabel = BUY_SIGNAL_CONFIG[buySignal].label;
  const items = Object.entries(scores) as [keyof AIScoreBreakdown, number][];

  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold text-text-primary">AI 評分</h2>
      <div className="flex flex-col items-center">
        <ScoreGauge score={totalScore} label={signalLabel} />
      </div>
      <div className="mt-6 space-y-3">
        {items.map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-14 text-xs text-text-secondary">
              {SCORE_LABELS[key]}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-bg-card-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-text-primary">
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
