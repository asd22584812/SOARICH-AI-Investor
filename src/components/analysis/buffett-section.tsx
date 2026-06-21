import type { BuffettScore } from "@/types/stock";
import { Crown } from "lucide-react";

interface BuffettSectionProps {
  buffett: BuffettScore;
}

export function BuffettSection({ buffett }: BuffettSectionProps) {
  const metrics = [
    { label: "ROE", value: `${buffett.roe}%` },
    { label: "自由現金流", value: buffett.freeCashFlow },
    { label: "負債比", value: `${buffett.debtRatio}%` },
    { label: "護城河", value: buffett.moat },
    { label: "獲利穩定性", value: buffett.profitStability },
  ];

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold text-text-primary">巴菲特認可度</h2>
        </div>
        <span className="text-2xl font-bold text-brand">{buffett.score}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl bg-bg-card-secondary p-3 text-center"
          >
            <p className="text-[10px] text-text-secondary">{m.label}</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        {buffett.summary}
      </p>
    </section>
  );
}
