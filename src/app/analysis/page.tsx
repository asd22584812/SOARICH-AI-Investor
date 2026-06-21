"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { getStockAnalysis } from "@/data/mock-data";
import { StockChart } from "@/components/charts/stock-chart";
import { StockPriceHeader } from "@/components/analysis/stock-price-header";
import { AIConclusionHero } from "@/components/analysis/ai-conclusion-hero";
import { BuySignalHero } from "@/components/analysis/buy-signal-hero";
import { AIScoreSection } from "@/components/analysis/ai-score-section";
import { ValuationSection } from "@/components/analysis/valuation-section";
import { MoatSection } from "@/components/analysis/moat-section";
import { KeyPersonSection } from "@/components/analysis/key-person-section";
import { BuffettSection } from "@/components/analysis/buffett-section";

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") ?? "";
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState(initialSymbol);
  const analysis = query ? getStockAnalysis(query) : null;

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
      const resolved = getStockAnalysis(initialSymbol);
      setQuery(resolved?.symbol ?? initialSymbol);
    }
  }, [initialSymbol]);

  const handleSearch = () => {
    const trimmed = symbol.trim();
    if (!trimmed) return;

    const resolved = getStockAnalysis(trimmed);
    if (resolved) {
      setQuery(resolved.symbol);
      router.replace(`/analysis?symbol=${resolved.symbol}`);
      return;
    }

    setQuery(trimmed);
  };

  if (!query && !analysis) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-lg font-semibold text-text-primary">個股分析</h1>
        </header>
        <SearchInput symbol={symbol} setSymbol={setSymbol} onSearch={handleSearch} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-secondary">輸入股票代號或名稱開始分析</p>
          <p className="mt-2 text-xs text-text-secondary/60">
            2330 · 台積電 · NVDA · NVIDIA · AAPL
          </p>
        </div>
      </div>
    );
  }

  if (query && !analysis) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-lg font-semibold text-text-primary">個股分析</h1>
        </header>
        <SearchInput symbol={symbol} setSymbol={setSymbol} onSearch={handleSearch} />
        <div className="rounded-2xl bg-danger/10 p-8 text-center">
          <p className="text-danger">找不到這檔股票，請確認代號或名稱。</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const seed = analysis.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  return (
    <div className="space-y-5 pb-6">
      <StockPriceHeader stock={analysis} />

      <StockChart
        basePrice={analysis.price}
        changePercent={analysis.changePercent}
        seed={seed}
      />

      <AIConclusionHero analysis={analysis} />

      <BuySignalHero signal={analysis.buySignal} />

      <AIScoreSection
        totalScore={analysis.totalScore}
        scores={analysis.aiScore}
        buySignal={analysis.buySignal}
      />

      <ValuationSection
        valuation={analysis.valuation}
        currentPrice={analysis.price}
        currency={analysis.currency}
      />

      <MoatSection moat={analysis.moat} />

      <KeyPersonSection risk={analysis.keyPersonRisk} />

      <BuffettSection buffett={analysis.buffett} />

      <section className="glass-card rounded-2xl p-5">
        <h2 className="mb-2 text-base font-semibold text-text-primary">成長展望</h2>
        <p className="text-sm leading-relaxed text-text-secondary">
          {analysis.aiConclusion.growthOutlook}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {analysis.aiConclusion.mainRisks.map((r) => (
            <span
              key={r}
              className="rounded-full bg-bg-card-secondary px-3 py-1 text-xs text-text-secondary"
            >
              {r}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function SearchInput({
  symbol,
  setSymbol,
  onSearch,
}: {
  symbol: string;
  setSymbol: (v: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        placeholder="2330 / 台積電 / NVDA / NVIDIA"
        className="h-11 w-full rounded-xl bg-bg-card-secondary pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none ring-1 ring-white/[0.06] focus:ring-brand/30"
      />
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-text-secondary">載入中...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}
