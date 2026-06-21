"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AllocationSlice } from "@/types/stock";

interface AllocationChartProps {
  title: string;
  data: AllocationSlice[];
}

export function AllocationChart({ title, data }: AllocationChartProps) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">{title}</h3>
      <div className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#0E0E0E",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value) => [`${value}%`, "占比"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-text-secondary">
              {d.name} <span className="text-text-primary font-medium">{d.value}%</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
