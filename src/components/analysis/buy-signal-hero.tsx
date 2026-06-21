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
        "flex flex-col items-center rounded-2xl border py-8 px-5",
        config.bg,
        config.border
      )}
    >
      <span className="text-5xl">{config.emoji}</span>
      <p className={cn("mt-3 text-2xl font-bold", config.color)}>
        {config.label}
      </p>
      <p className="mt-2 text-center text-sm text-text-secondary">
        依據目前股價與合理價比較
      </p>
    </section>
  );
}
