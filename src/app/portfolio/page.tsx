"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { PortfolioHolding, PortfolioPosition } from "@/types/stock";
import { usePortfolio } from "@/hooks/use-portfolio";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { HoldingFormDialog } from "@/components/portfolio/holding-form-dialog";
import { HoldingsList } from "@/components/portfolio/holdings-list";
import { PerformanceRanking } from "@/components/portfolio/performance-ranking";
import { PortfolioEmptyState } from "@/components/portfolio/portfolio-empty-state";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";

export default function PortfolioPage() {
  const {
    positions,
    computed,
    loading,
    refreshing,
    addPosition,
    updatePosition,
    removePosition,
    reload,
  } = usePortfolio();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioPosition | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (holding: PortfolioHolding) => {
    setEditing({
      id: holding.id,
      symbol: holding.symbol,
      shares: holding.shares,
      avgCost: holding.avgCost,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (values: Omit<PortfolioPosition, "id">) => {
    if (editing) {
      updatePosition(editing.id, values);
      return;
    }
    addPosition(values);
  };

  const isEmpty = positions.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">投資組合</h1>
        {!isEmpty && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={refreshing}
              className="rounded-full bg-bg-card-secondary p-2 text-text-secondary transition-colors hover:text-brand disabled:opacity-50"
              aria-label="重新整理"
            >
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-full bg-brand/15 px-3.5 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/25"
            >
              <Plus className="h-3.5 w-3.5" />
              新增持股
            </button>
          </div>
        )}
      </header>

      {loading && !isEmpty && (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-10 text-center text-sm text-text-secondary">
          載入投資組合與即時股價中...
        </div>
      )}

      {isEmpty && <PortfolioEmptyState onAdd={openCreate} />}

      {!isEmpty && computed && !loading && (
        <>
          <PortfolioSummary portfolio={computed} />

          {computed.bySymbol.length > 0 && (
            <AllocationChart title="持股比例" data={computed.bySymbol} />
          )}

          {computed.byIndustry.length > 0 && (
            <AllocationChart title="產業比例" data={computed.byIndustry} />
          )}

          {computed.byCountry.length > 0 && (
            <AllocationChart title="國家比例" data={computed.byCountry} />
          )}

          <HoldingsList
            holdings={computed.holdings}
            onEdit={openEdit}
            onDelete={removePosition}
          />

          <PerformanceRanking
            holdings={computed.holdings}
            currency={computed.displayCurrency}
          />
        </>
      )}

      <HoldingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
