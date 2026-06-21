"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { MoatAnalysis } from "@/types/stock";
import { MOAT_RADAR_LABELS } from "@/lib/constants";

interface MoatRadarProps {
  moat: MoatAnalysis;
}

export function MoatRadar({ moat }: MoatRadarProps) {
  const data = [
    { subject: MOAT_RADAR_LABELS.brand, value: moat.brand },
    { subject: MOAT_RADAR_LABELS.technology, value: moat.technology },
    { subject: MOAT_RADAR_LABELS.scaleEconomy, value: moat.scaleEconomy },
    { subject: MOAT_RADAR_LABELS.switchingCost, value: moat.switchingCost },
    { subject: MOAT_RADAR_LABELS.networkEffect, value: moat.networkEffect },
  ];

  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#9A9A9A", fontSize: 11 }}
          />
          <Radar
            name="護城河"
            dataKey="value"
            stroke="#C8A85D"
            fill="#C8A85D"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
