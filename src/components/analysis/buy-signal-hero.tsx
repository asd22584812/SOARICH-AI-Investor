import type { BuySignal } from "@/types/stock";
import { BUY_SIGNAL_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BuySignalHeroProps {
  signal: BuySignal;
}

export function BuySignalHero({ signal }: BuySignalHeroProps) {
  const config = BUY_SIGNAL_CONFIG[signal];

  return (
    <section
      className={cn(
        "buy-signal-hero flex flex-col items-center rounded-3xl border px-5 py-8 text-center",
        config.bg,
        config.border
      )}
    >
      <span className="text-6xl leading-none">{config.emoji}</span>
      <p className={cn("mt-4 text-3xl font-black tracking-tight", config.color)}>
        {config.label}
      </p>
      <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-text-secondary">
        依據合理價、安全邊際與 AI 綜合評分計算
      </p>
    </section>
  );
}
