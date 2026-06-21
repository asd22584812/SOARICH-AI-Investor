"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getStockAnalysis } from "@/data/mock-data";
import { StockSearchField } from "@/components/home/stock-search-field";
import { StockPriceHeader } from "@/components/analysis/stock-price-header";
import { AIScoreSection } from "@/components/analysis/ai-score-section";
import { BuySignalHero } from "@/components/analysis/buy-signal-hero";
import { ValuationSection } from "@/components/analysis/valuation-section";
import { MarginOfSafetySection } from "@/components/analysis/margin-of-safety-section";
import { MoatSection } from "@/components/analysis/moat-section";
import { FinancialsSection } from "@/components/analysis/financials-section";
import { BuffettSection } from "@/components/analysis/buffett-section";
import { KeyPersonSection } from "@/components/analysis/key-person-section";
import { AIConclusionHero } from "@/components/analysis/ai-conclusion-hero";

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

  return (
    <div className="analysis-page space-y-5 pb-6">
      <SearchInput symbol={symbol} setSymbol={setSymbol} onSearch={handleSearch} />

      <StockPriceHeader stock={analysis} />

      <AIScoreSection totalScore={analysis.totalScore} scores={analysis.aiScore} />

      <BuySignalHero signal={analysis.buySignal} />

      <ValuationSection
        valuation={analysis.valuation}
        currentPrice={analysis.price}
        currency={analysis.currency}
      />

      <MarginOfSafetySection valuation={analysis.valuation} />

      <MoatSection moat={analysis.moat} />

      <FinancialsSection financials={analysis.financialProfile} />

      <BuffettSection buffett={analysis.buffett} />

      <KeyPersonSection risk={analysis.keyPersonRisk} />

      <AIConclusionHero analysis={analysis} />
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
    <StockSearchField
      value={symbol}
      onChange={setSymbol}
      onSubmit={onSearch}
      placeholder="2330 / 台積電 / NVDA / NVIDIA"
    />
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-text-secondary">載入中...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}
