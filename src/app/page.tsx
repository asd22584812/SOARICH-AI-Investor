"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mergeRadar } from "@/lib/research/merge-radar";
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
  const [cursor,setCursor]=useState(0);
  const [nextCursor,setNextCursor]=useState<number|null>(0);
  const [busy,setBusy]=useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller=new AbortController();
    let cancelled=false;
    async function scan(){
      let current:number|null=cursor;
      try{
        // Three bounded requests: progress remains visible without a long server scan.
        for(let batch=0;batch<3 && current!=null;batch++){
          const timer=setTimeout(()=>controller.abort(),55000);
          let value:HomeFeedResponse;
          try {value=await fetchHomeMarketFeed(marketFilter,current,controller.signal);}
          finally {clearTimeout(timer);}
          if(cancelled)return;
          const incoming=value.researchRadar!;
          setResult(old=>({...value,researchRadar:mergeRadar(old?.researchRadar,incoming)}));
          const next=incoming.nextCursor??null;
          if(next!=null && next<=current)throw new Error('市場分頁沒有前進，已停止掃描。');
          current=next;
          setNextCursor(current);
        }
      }catch(e){
        if(!cancelled){setNextCursor(current);setError(controller.signal.aborted?'本批讀取逾時，已保留完成結果，可重試。':e instanceof Error?e.message:'市場來源暫時無法取得');}
      }finally{if(!cancelled)setBusy(false);}
    }
    void scan();
    return ()=>{cancelled=true;controller.abort();};
  }, [marketFilter,attempt,cursor]);
  const radar = result?.researchRadar;
  return <div className="space-y-5">
    <AppHeader /><AssetHero /><SearchBar />
    <SegmentControl options={[{ value: "TW" as const, label: "台股" }, { value: "US" as const, label: "美股" }]} value={marketFilter} onChange={setMarketFilter} />
    <section className="glass-card rounded-3xl p-5 space-y-3">
      <h2 className="text-lg font-semibold">符合模型入場價格的候選</h2>
      <p role="status" className="text-sm text-text-secondary">{error ?? (busy ? "正在逐批核對財報與價格，完成的結果會立即顯示…" : "本輪檢查完成。以下只列通過零成長模型價格條件的候選。")}</p>
      {radar && <><p className="text-sm">{radar.description}</p><p className="text-xs text-text-secondary">{radar.coverage}</p><p className="text-sm">累計核對 {radar.candidates.length+(radar.excluded?.length??0)} 檔 · 符合 {radar.candidates.length} 檔 · 排除 {radar.excluded?.length??0} 檔</p><p className="text-xs text-text-secondary">來源日期：{radar.sourceDate ?? "未提供"}</p></>}
      <button type="button" className="rounded-xl border border-brand/40 px-4 py-2 text-brand" onClick={() => { setResult(null); setCursor(0); setNextCursor(0); setBusy(true); setError(null); setAttempt(n => n + 1); }} disabled={busy}>重新讀取</button>
    </section>
    {radar && !busy && radar.candidates.length === 0 && <p className="p-5 text-text-secondary">本次已檢查的候選中，沒有同時通過財報完整性與入場價格條件的股票。請查看上方排除數量；不以未驗證股票補滿名單。</p>}
    {!busy && nextCursor!=null && <button type="button" className="rounded-xl border border-brand/40 px-4 py-2 text-brand" onClick={()=>{setCursor(nextCursor);setAttempt(n=>n+1);setBusy(true);setError(null);}}>{error?'重試未完成批次':'繼續檢查後續批次（保留已找到的股票）'}</button>}
    {radar?.excluded && radar.excluded.length>0 && <details className="p-5 text-sm"><summary className="cursor-pointer text-brand">查看本次排除原因（不是入場候選）</summary>{radar.excluded.map(x=><p key={x.symbol} className="mt-2 text-text-secondary">{x.symbol}：{x.reason}</p>)}</details>}
    <div className="grid gap-4 sm:grid-cols-2">
      {radar?.candidates.map(stock => <article key={stock.symbol} className="glass-card rounded-2xl p-5 space-y-3">
        <Link href={`/analysis?symbol=${encodeURIComponent(stock.symbol)}`} className="block text-lg font-semibold text-brand">{stock.name}（{stock.symbol}）</Link>
        <p>{stock.currency === "TWD" ? "NT$" : "US$"}{stock.price.toLocaleString("zh-TW", { maximumFractionDigits: 2 })} · 本益比 {stock.pe.toFixed(2)} 倍</p>
        <p className="text-brand">入場上限 {stock.currency} {stock.entry?.toFixed(2)} · 零成長基準價 {stock.fair?.toFixed(2)}</p>
        <p className="text-sm text-text-secondary">{stock.reason}</p>
        <p className="text-xs text-text-secondary">報價日期：{stock.asOf ?? "未提供"}</p>
        <a href={stock.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-brand underline">查看篩選資料來源</a>
      </article>)}
    </div>
    <p className="text-xs text-text-secondary">逐批核對版 2026-10-20 · 估值與初篩不代表獲利機率。</p>
  </div>;
}
export default function HomePage() {
  const { marketFilter } = useMarketFilter();
  return <HomePageContent key={marketFilter} />;
}
