"use client";

import { useEffect, useState } from "react";
import type { PortfolioPosition } from "@/types/stock";
import { fetchStockAnalysis } from "@/lib/stock/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HoldingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PortfolioPosition | null;
  onSubmit: (values: Omit<PortfolioPosition, "id">) => Promise<void> | void;
}

export function HoldingFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: HoldingFormDialogProps) {
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSymbol(initial?.symbol ?? "");
    setShares(initial ? String(initial.shares) : "");
    setAvgCost(initial ? String(initial.avgCost) : "");
    setError("");
  }, [open, initial]);

  const handleSubmit = async () => {
    const trimmedSymbol = symbol.trim();
    const sharesValue = Number(shares);
    const avgCostValue = Number(avgCost);

    if (!trimmedSymbol) {
      setError("請輸入股票代號");
      return;
    }
    if (!Number.isFinite(sharesValue) || sharesValue <= 0) {
      setError("持有股數必須大於 0");
      return;
    }
    if (!Number.isFinite(avgCostValue) || avgCostValue <= 0) {
      setError("平均成本必須大於 0");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const analysis = await fetchStockAnalysis(trimmedSymbol);
      if (!analysis) {
        setError("找不到這檔股票，請確認代號或名稱");
        return;
      }

      await onSubmit({
        symbol: analysis.symbol,
        shares: sharesValue,
        avgCost: avgCostValue,
      });
      onOpenChange(false);
    } catch {
      setError("儲存失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw]">
        <DialogHeader>
          <DialogTitle>{initial ? "編輯持股" : "新增持股"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            label="股票代號"
            value={symbol}
            onChange={setSymbol}
            placeholder="2330 / 台積電 / NVDA"
            disabled={submitting}
          />
          <Field
            label="持有股數"
            value={shares}
            onChange={setShares}
            placeholder="100"
            inputMode="decimal"
            disabled={submitting}
          />
          <Field
            label="平均成本"
            value={avgCost}
            onChange={setAvgCost}
            placeholder="920"
            inputMode="decimal"
            disabled={submitting}
          />

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-bg-primary disabled:opacity-60"
          >
            {submitting ? "驗證中..." : initial ? "儲存變更" : "新增持股"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "decimal" | "text";
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="h-11 w-full rounded-xl bg-bg-card-secondary px-4 text-sm text-text-primary outline-none ring-1 ring-white/[0.06] focus:ring-brand/30 disabled:opacity-60"
      />
    </label>
  );
}
