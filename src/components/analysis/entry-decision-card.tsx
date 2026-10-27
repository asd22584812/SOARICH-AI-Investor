"use client";

import type { StockAnalysis } from "@/types/stock";
import { formatCurrency, formatMarginOfSafetyDisplay, cn } from "@/lib/utils";

interface EntryDecisionCardProps {
  analysis: StockAnalysis;
}

function decisionCopy(analysis: StockAnalysis): {
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "caution" | "negative";
} {
  const mos = analysis.valuation.marginOfSafety ?? 0;
  const rating = analysis.totalScore;

  if (analysis.entryLabel === "深度低估，值得深入研究") {
    return {
      title: "可深入研究進場機會",
      detail:
        "現價明顯低於模型合理價，且公司品質評分偏高。這是研究優先級，不是保證獲利訊號。",
      tone: "positive",
    };
  }
  if (analysis.entryLabel === "具安全邊際") {
    return {
      title: "具安全邊際，可觀察布局",
      detail:
        "現價低於合理價，適合列入觀察並評估分批進場，仍需確認產業與財報品質。",
      tone: "positive",
    };
  }
  if (analysis.entryLabel === "接近合理價") {
    return {
      title: "接近合理價",
      detail: "估值大致合理，未必急著追價；可等待更好的進場價或確認成長動能。",
      tone: "neutral",
    };
  }
  if (analysis.entryLabel === "好公司，但價格偏高") {
    return {
      title: "好公司，但價格偏高",
      detail: `公司品質不錯（評級 ${rating}），但現價高於合理價約 ${formatMarginOfSafetyDisplay(Math.abs(mos))}。偏向等待回檔。`,
      tone: "caution",
    };
  }
  return {
    title: "暫不具吸引力",
    detail:
      mos < 0
        ? "現價高於合理價，或公司評分不足以支撐進場。建議先觀望。"
        : "資料或品質條件不足，暫不建議主動進場。",
    tone: "negative",
  };
}

const TONE_CLASS = {
  positive: "border-success/30 bg-success/10 text-success",
  neutral: "border-brand/25 bg-brand/10 text-brand",
  caution: "border-warning/30 bg-warning/10 text-warning",
  negative: "border-danger/30 bg-danger/10 text-danger",
} as const;

export function EntryDecisionCard({ analysis }: EntryDecisionCardProps) {
  const decision = decisionCopy(analysis);
  const mos = analysis.valuation.marginOfSafety;
  const belowFair = mos != null && mos > 0;

  return (
    <section className="glass-card rounded-3xl border border-white/[0.06] p-5">
      <h2 className="text-base font-semibold text-text-primary">進場判斷</h2>
      <p className="mt-1 text-xs text-text-secondary">
        依現價 vs 合理價、安全邊際與 SOARICH Rating 綜合判定
      </p>

      <div
        className={cn(
          "mt-4 rounded-2xl border px-4 py-3",
          TONE_CLASS[decision.tone]
        )}
      >
        <p className="text-lg font-bold tracking-tight">{decision.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed opacity-90">
          {decision.detail}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-bg-card-secondary/70 px-3 py-3">
          <p className="text-[10px] text-text-secondary">現價</p>
          <p className="mt-1 text-base font-semibold text-text-primary">
            {formatCurrency(analysis.price, analysis.currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-bg-card-secondary/70 px-3 py-3">
          <p className="text-[10px] text-text-secondary">模型合理價</p>
          <p className="mt-1 text-base font-semibold text-brand">
            {analysis.valuation.fairPrice != null
              ? formatCurrency(analysis.valuation.fairPrice, analysis.currency)
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-bg-card-secondary/70 px-3 py-3">
          <p className="text-[10px] text-text-secondary">安全邊際</p>
          <p
            className={cn(
              "mt-1 text-base font-semibold",
              belowFair ? "text-success" : "text-danger"
            )}
          >
            {mos != null ? formatMarginOfSafetyDisplay(mos) : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-bg-card-secondary/70 px-3 py-3">
          <p className="text-[10px] text-text-secondary">估值模型</p>
          <p className="mt-1 text-xs font-medium leading-snug text-text-primary">
            {analysis.valuation.valuationModel ?? "綜合估值"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-text-secondary">
        合理價為模型估算，非保證買點。任何估值系統都無法承諾固定勝率；請搭配風險控管與自身研究。
      </p>
    </section>
  );
}
