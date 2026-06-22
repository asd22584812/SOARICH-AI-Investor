"use client";

import { Plus } from "lucide-react";

interface PortfolioEmptyStateProps {
  onAdd: () => void;
}

export function PortfolioEmptyState({ onAdd }: PortfolioEmptyStateProps) {
  return (
    <section className="glass-card flex flex-col items-center rounded-3xl px-6 py-16 text-center">
      <p className="text-base font-medium text-text-primary">尚未建立投資組合</p>
      <p className="mt-2 max-w-[260px] text-sm text-text-secondary">
        新增第一筆持股開始追蹤績效
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-bg-primary"
      >
        <Plus className="h-4 w-4" />
        新增持股
      </button>
    </section>
  );
}
