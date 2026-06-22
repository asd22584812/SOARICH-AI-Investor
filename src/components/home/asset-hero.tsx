"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { SegmentControl } from "@/components/ui/segment-control";
import { usePortfolio } from "@/hooks/use-portfolio";
import {
  buildFlatAssetHistory,
  getPrimaryPortfolioTotals,
} from "@/lib/portfolio/asset-overview";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

export function AssetHero() {
  const { positions, computed, loading } = usePortfolio();
  const [hidden, setHidden] = useState(false);
  const [period, setPeriod] = useState<"7D" | "30D">("7D");

  const isEmpty = positions.length === 0;
  const totals = computed ? getPrimaryPortfolioTotals(computed) : null;
  const totalAssets = totals?.totalAssets ?? 0;
  const dailyPnL = totals?.dailyPnL ?? 0;
  const dailyPnLPercent = totals?.dailyPnLPercent ?? 0;
  const currency = totals?.currency ?? "TWD";
  const positive = dailyPnL >= 0;

  const chartData = useMemo(() => {
    if (isEmpty || !totals) return [];
    const days = period === "7D" ? 7 : 30;
    return buildFlatAssetHistory(totalAssets, days);
  }, [isEmpty, totals, period, totalAssets]);

  return (
    <section className="card-glass w-full rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">總資產</span>
        <button
          type="button"
          onClick={() => setHidden(!hidden)}
          className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <p className="mt-1 text-[2rem] font-semibold tracking-tight text-text-primary">
        {hidden ? "•••••••" : formatCurrency(totalAssets, currency)}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-text-secondary">今日損益</span>
        <span
          className={cn(
            "text-sm font-semibold",
            positive ? "text-success" : "text-danger"
          )}
        >
          {hidden
            ? "••••"
            : `${positive ? "+" : ""}${formatCurrency(dailyPnL, currency)} (${formatPercent(dailyPnLPercent)})`}
        </span>
      </div>

      {isEmpty && !loading && (
        <div className="mt-4 rounded-2xl bg-bg-card-secondary/60 px-4 py-3 text-center">
          <p className="text-sm font-medium text-text-primary">尚未建立投資組合</p>
          <p className="mt-1 text-xs text-text-secondary">
            新增第一筆持股開始追蹤績效
          </p>
          <Link
            href="/portfolio"
            className="mt-3 inline-block text-xs font-medium text-brand"
          >
            前往持股頁
          </Link>
        </div>
      )}

      {loading && positions.length > 0 && (
        <p className="mt-4 text-center text-xs text-text-secondary">更新資產中...</p>
      )}

      <div className="mt-5">
        <SegmentControl
          options={[
            { value: "7D", label: "7日" },
            { value: "30D", label: "30日" },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <div className="mt-3">
          {isEmpty || chartData.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-2xl bg-bg-card-secondary/40">
              <p className="px-4 text-center text-xs text-text-secondary">
                新增持股後將開始追蹤績效曲線
              </p>
            </div>
          ) : (
            <MiniAreaChart data={chartData} positive={positive} height={80} />
          )}
        </div>
      </div>
    </section>
  );
}
