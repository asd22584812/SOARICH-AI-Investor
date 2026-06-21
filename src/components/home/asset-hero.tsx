"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { MOCK_ASSET_OVERVIEW, getAssetHistory7D, getAssetHistory30D } from "@/data/mock-data";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { SegmentControl } from "@/components/ui/segment-control";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

export function AssetHero() {
  const [hidden, setHidden] = useState(false);
  const [period, setPeriod] = useState<"7D" | "30D">("7D");
  const asset = MOCK_ASSET_OVERVIEW;
  const positive = asset.dailyPnL >= 0;
  const chartData = period === "7D" ? getAssetHistory7D() : getAssetHistory30D();

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
        {hidden ? "•••••••" : formatCurrency(asset.totalAssets, asset.currency)}
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
            : `${positive ? "+" : ""}${formatCurrency(asset.dailyPnL, asset.currency)} (${formatPercent(asset.dailyPnLPercent)})`}
        </span>
      </div>

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
          <MiniAreaChart data={chartData} positive={positive} height={80} />
        </div>
      </div>
    </section>
  );
}
