"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { ChartRange } from "@/lib/chart-utils";
import { generatePriceHistory } from "@/lib/chart-utils";
import { CHART_RANGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StockChartProps {
  basePrice: number;
  changePercent: number;
  seed: number;
  positive?: boolean;
}

export function StockChart({
  basePrice,
  changePercent,
  seed,
  positive,
}: StockChartProps) {
  const [range, setRange] = useState<ChartRange>("1M");
  const isPositive = positive ?? changePercent >= 0;
  const color = isPositive ? "#22C55E" : "#EF4444";

  const data = useMemo(
    () => generatePriceHistory(basePrice, seed, range, changePercent),
    [basePrice, seed, range, changePercent]
  );

  const gradientId = useMemo(() => `stock-${seed}`, [seed]);

  return (
    <div className="space-y-3">
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {CHART_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
              range === r
                ? "bg-brand/15 text-brand"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
