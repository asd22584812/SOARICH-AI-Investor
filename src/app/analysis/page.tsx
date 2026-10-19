"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StockResearchReport } from "@/types/stock";
import { fetchStockAnalysis } from "@/lib/stock/api-client";
import { StockSearchField } from "@/components/home/stock-search-field";
import { StockPriceHeader } from "@/components/analysis/stock-price-header";
import { OfficialFinancialsSection } from "@/components/analysis/official-financials";
import { EntryResearch } from "@/components/analysis/entry-research";

function AnalysisContent({initialSymbol}:{initialSymbol:string}) {
  const router = useRouter();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState(initialSymbol);
  const [analysis, setAnalysis] = useState<StockResearchReport | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(!!initialSymbol.trim());
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadSymbol = initialSymbol.trim();
    if (!loadSymbol) return;
    let cancelled = false;

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
    if (trimmed === initialSymbol) { setLoading(true); setNotFound(false); setReload((value) => value + 1); }
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

      <EntryResearch report={analysis} />
      {analysis.official ? <OfficialFinancialsSection data={analysis.official} /> : <p className="rounded-xl bg-brand/10 p-4 text-sm text-brand">官方申報來源目前未取得：{analysis.officialError ?? "資料尚未接入"}。上方若有第三方明細，已另外標示來源。</p>}
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

function AnalysisRoute() {
  const initialSymbol=useSearchParams().get('symbol')??'';
  return <AnalysisContent key={initialSymbol} initialSymbol={initialSymbol} />;
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-text-secondary">載入中...</div>}>
      <AnalysisRoute />
    </Suspense>
  );
}
