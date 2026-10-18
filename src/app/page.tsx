"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomeFeedResponse } from "@/types/stock";
import { fetchHomeMarketFeed } from "@/lib/stock/api-client";
import { AssetHero } from "@/components/home/asset-hero";
import { SearchBar } from "@/components/home/search-bar";
import { AppHeader } from "@/components/layout/app-header";
import { SegmentControl } from "@/components/ui/segment-control";
import { useMarketFilter } from "@/contexts/market-filter-context";

function HomePageContent() {
  const { marketFilter, setMarketFilter } = useMarketFilter();
  const [result, setResult] = useState<HomeFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchHomeMarketFeed(marketFilter).then(value => {
      if (!cancelled) setResult(value);
    }).catch(() => {
      if (!cancelled) setError("市場來源暫時無法取得，請按重新讀取。這不代表市場沒有候選股票。");
    });
    return () => { cancelled = true; };
  }, [marketFilter, attempt]);
  const radar = result?.researchRadar;
  return <div className="space-y-5">
    <AppHeader /><AssetHero /><SearchBar />
    <SegmentControl options={[{ value: "TW" as const, label: "台股" }, { value: "US" as const, label: "美股" }]} value={marketFilter} onChange={setMarketFilter} />
    <section className="glass-card rounded-3xl p-5 space-y-3">
      <h2 className="text-lg font-semibold">市場研究候選</h2>
      <p role="status" className="text-sm text-text-secondary">{error ?? result?.message ?? "正在取得市場來源資料…"}</p>
      {radar && <><p className="text-sm">{radar.description}</p><p className="text-xs text-text-secondary">{radar.coverage}</p><p className="text-xs text-text-secondary">來源日期：{radar.sourceDate ?? "未提供"}</p></>}
      <button type="button" className="rounded-xl border border-brand/40 px-4 py-2 text-brand" onClick={() => { setResult(null); setError(null); setAttempt(n => n + 1); }} disabled={!result && !error}>重新讀取</button>
    </section>
    {radar && radar.candidates.length === 0 && <p className="p-5 text-text-secondary">本次來源中沒有通過資料時效與初篩條件的股票。</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      {radar?.candidates.map(stock => <article key={stock.symbol} className="glass-card rounded-2xl p-5 space-y-3">
        <Link href={`/analysis?symbol=${encodeURIComponent(stock.symbol)}`} className="block text-lg font-semibold text-brand">{stock.name}（{stock.symbol}）</Link>
        <p>{stock.currency === "TWD" ? "NT$" : "US$"}{stock.price.toLocaleString("zh-TW", { maximumFractionDigits: 2 })} · 本益比 {stock.pe.toFixed(2)} 倍</p>
        <p className="text-sm text-text-secondary">{stock.reason}</p>
        <p className="text-xs text-text-secondary">報價日期：{stock.asOf ?? "未提供"}</p>
        <a href={stock.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-brand underline">查看篩選資料來源</a>
      </article>)}
    </div>
    <p className="text-xs text-text-secondary">財報研究版 2026-10-15 · 估值與初篩不代表獲利機率。</p>
  </div>;
}
export default function HomePage() {
  const { marketFilter } = useMarketFilter();
  return <HomePageContent key={marketFilter} />;
}
