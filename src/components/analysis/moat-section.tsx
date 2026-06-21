import type { MoatAnalysis } from "@/types/stock";
import { MoatRadar } from "@/components/charts/moat-radar";

interface MoatSectionProps {
  moat: MoatAnalysis;
}

export function MoatSection({ moat }: MoatSectionProps) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">護城河分析</h2>
        <div className="text-right">
          <span className="text-2xl font-bold text-brand">{moat.score}</span>
          <span className="text-sm text-text-secondary">/100</span>
        </div>
      </div>
      <MoatRadar moat={moat} />
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {moat.summary}
      </p>
    </section>
  );
}
