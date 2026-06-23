import type { MoatAnalysis } from "@/types/stock";
import { MOAT_RADAR_LABELS } from "@/lib/constants";
import { MoatRadar } from "@/components/charts/moat-radar";

interface MoatSectionProps {
  moat: MoatAnalysis;
}

const MOAT_KEYS = [
  "brand",
  "technology",
  "scaleEconomy",
  "switchingCost",
  "networkEffect",
] as const;

export function MoatSection({ moat }: MoatSectionProps) {
  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">護城河分析</h2>
        <div className="text-right">
          <span className="text-2xl font-bold text-brand">{moat.score}</span>
          <span className="text-sm text-text-secondary">/100</span>
        </div>
      </div>

      <div className="space-y-3">
        {MOAT_KEYS.map((key) => {
          const value = moat[key];
          const label = MOAT_RADAR_LABELS[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-20 text-xs text-text-secondary">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-card-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-brand"
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-semibold text-text-primary">
                {value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <MoatRadar moat={moat} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{moat.summary}</p>
      {moat.isEstimate ? (
        <p className="mt-2 text-xs text-text-secondary">護城河為模型估算</p>
      ) : null}
    </section>
  );
}
