"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StockAnalysis } from "@/types/stock";
import { fetchStockAnalysis } from "@/lib/stock/api-client";
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
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadSymbol = initialSymbol.trim();
    if (!loadSymbol) {
      setAnalysis(null);
      setQuery("");
      setNotFound(false);
      return;
    }

    setSymbol(loadSymbol);
    setQuery(loadSymbol);
    setLoading(true);
    setNotFound(false);

    fetchStockAnalysis(loadSymbol)
      .then((result) => {
        if (!result) {
          setAnalysis(null);
          setNotFound(true);
          return;
        }
        setAnalysis(result);
        setQuery(result.symbol);
        setSymbol(result.symbol);
      })
      .catch(() => {
        setAnalysis(null);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [initialSymbol]);

  const handleSearch = async () => {
    const trimmed = symbol.trim();
    if (!trimmed) return;

    setLoading(true);
    setNotFound(false);

    try {
      const result = await fetchStockAnalysis(trimmed);
      if (!result) {
        setAnalysis(null);
        setQuery(trimmed);
        setNotFound(true);
        return;
      }

      setAnalysis(result);
      setQuery(result.symbol);
      setSymbol(result.symbol);
      router.replace(`/analysis?symbol=${encodeURIComponent(result.symbol)}`);
    } catch {
      setAnalysis(null);
      setQuery(trimmed);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (!query && !analysis && !loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-lg font-semibold text-text-primary">個股分析</h1>
        </header>
        <SearchInput symbol={symbol} setSymbol={setSymbol} onSearch={handleSearch} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-secondary">輸入股票代號或名稱開始分析</p>
          <p className="mt-2 text-xs text-text-secondary/60">
            2330 · 台積電 · NVDA · TSLA · AMD · META
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-lg font-semibold text-text-primary">個股分析</h1>
        </header>
        <SearchInput symbol={symbol} setSymbol={setSymbol} onSearch={handleSearch} />
        <div className="py-20 text-center text-text-secondary">載入 Yahoo Finance 資料中...</div>
      </div>
    );
  }

  if ((query || initialSymbol) && !analysis && notFound) {
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
      placeholder="2330 / 台積電 / NVDA / TSLA"
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
