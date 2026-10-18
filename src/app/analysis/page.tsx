"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StockResearchReport } from "@/types/stock";
import { fetchStockAnalysis } from "@/lib/stock/api-client";
import { StockSearchField } from "@/components/home/stock-search-field";
import { StockPriceHeader } from "@/components/analysis/stock-price-header";
import { OfficialFinancialsSection } from "@/components/analysis/official-financials";
import { FinancialsSection } from "@/components/analysis/financials-section";

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") ?? "";
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState(initialSymbol);
  const [analysis, setAnalysis] = useState<StockResearchReport | null>(null);
  const [reload, setReload] = useState(0);
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

    let cancelled = false;
    setSymbol(loadSymbol);
    setQuery(loadSymbol);
    setLoading(true);
    setNotFound(false);

    fetchStockAnalysis(loadSymbol)
      .then((result) => {
        if (cancelled) return;
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
        if (cancelled) return;
        setAnalysis(null);
        setNotFound(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialSymbol, reload]);

  const handleSearch = () => {
    const trimmed = symbol.trim();
    if (!trimmed) return;
    if (trimmed === initialSymbol) setReload((value) => value + 1);
    else router.replace(`/analysis?symbol=${encodeURIComponent(trimmed)}`);
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
        <div className="py-20 text-center text-text-secondary">載入分析資料中...</div>
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
          <p className="text-danger">未取得這檔股票的資料。請確認代號；也可能是來源暫時無法連線。</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="analysis-page space-y-5 pb-6">
      <SearchInput symbol={symbol} setSymbol={setSymbol} onSearch={handleSearch} />

      <StockPriceHeader stock={analysis} />

      <section className="glass-card rounded-3xl p-5 space-y-3">
        <h2 className="font-semibold text-brand">{analysis.scenarioValuation?.status === "available" ? "已取得官方財報與情境試算" : "暫無法判斷買入價格"}</h2>
        {analysis.valuationReasons.map((reason) => <p key={reason} className="text-sm text-text-secondary">{reason}</p>)}
        <p className="text-sm text-text-secondary">護城河、關鍵人物與接班制度：尚未完成有來源的公司研究，不評分。</p>
      </section>
      {analysis.official ? <OfficialFinancialsSection data={analysis.official} scenario={analysis.scenarioValuation} /> : <p className="rounded-xl bg-brand/10 p-4 text-sm text-brand">官方財報未取得：{analysis.officialError ?? "資料尚未接入"}</p>}
      {!analysis.quoteSource && <FinancialsSection financials={analysis.financialProfile} currency={analysis.currency} financialCurrency={analysis.financialCurrency} />}
      <section className="glass-card rounded-3xl p-5 space-y-3 text-sm">
        <h2 className="font-semibold">資料來源與核對</h2>
        <p className="text-text-secondary">上方官方財報標示實際期間；第三方彙總指標的期間尚未逐項核對，不應與官方累計或年度數字直接比較。</p>
        <a className="block text-brand underline" href={analysis.sourceUrl} target="_blank" rel="noopener noreferrer">{analysis.quoteSource ? "官方行情原始資料" : "Yahoo 財務資料（第三方來源）"}</a>
        <a className="block text-brand underline" href={analysis.officialSourceUrl} target="_blank" rel="noopener noreferrer">{analysis.market === "TW" ? "公開資訊觀測站" : "SEC EDGAR"}：以代號 {analysis.symbol} 查詢原始申報</a>
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
