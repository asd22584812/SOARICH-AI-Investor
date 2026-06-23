"use client";

import type { EntrySignal } from "@/types/stock";
import { ENTRY_SIGNAL_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface EntrySignalHeroProps {
  signal: EntrySignal;
  entryLabel?: string;
}

export function BuySignalHero({ signal, entryLabel }: EntrySignalHeroProps) {
  const config = ENTRY_SIGNAL_CONFIG[signal];
  const label = entryLabel ?? config.label;

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
        {label}
      </p>
      <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-text-secondary">
        依據安全邊際與公司品質判定入場時機，非單純綜合評級
      </p>
    </section>
  );
}
