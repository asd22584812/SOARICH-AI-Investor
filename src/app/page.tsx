"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mergeRadar } from "@/lib/research/merge-radar";
import type { HomeFeedResponse } from "@/types/stock";
import { fetchHomeMarketFeed } from "@/lib/stock/api-client";
import { AssetHero } from "@/components/home/asset-hero";
import { SearchBar } from "@/components/home/search-bar";
import { AppHeader } from "@/components/layout/app-header";
import { SegmentControl } from "@/components/ui/segment-control";
import { useMarketFilter } from "@/contexts/market-filter-context";
import { cn } from "@/lib/utils";

function formatMoney(value: number | undefined, currency: "TWD" | "USD") {
  if (value == null || !Number.isFinite(value)) return "—";
  const prefix = currency === "TWD" ? "NT$" : "US$";
  return `${prefix}${value.toLocaleString("zh-TW", {
    maximumFractionDigits: currency === "TWD" ? 1 : 2,
  })}`;
}

function HomePageContent() {
  const { marketFilter, setMarketFilter } = useMarketFilter();
  const [result, setResult] = useState<HomeFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [busy, setBusy] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function scan() {
      let current: number | null = cursor;
      try {
        for (let batch = 0; batch < 3 && current != null; batch++) {
          const timer = setTimeout(() => controller.abort(), 55000);
          let value: HomeFeedResponse;
          try {
            value = await fetchHomeMarketFeed(
              marketFilter,
              current,
              controller.signal
            );
          } finally {
            clearTimeout(timer);
          }
          if (cancelled) return;
          const incoming = value.researchRadar!;
          setResult((old) => ({
            ...value,
            researchRadar: mergeRadar(old?.researchRadar, incoming),
          }));
          const next = incoming.nextCursor ?? null;
          if (next != null && next <= current) {
            throw new Error("市場分頁沒有前進，已停止掃描。");
          }
          current = next;
          setNextCursor(current);
        }
      } catch (e) {
        if (!cancelled) {
          setNextCursor(current);
          setError(
            controller.signal.aborted
              ? "本批讀取逾時，已保留完成結果，可重試。"
              : e instanceof Error
                ? e.message
                : "市場來源暫時無法取得"
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void scan();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [marketFilter, attempt, cursor]);

  const radar = result?.researchRadar;

  const rankedCandidates = useMemo(() => {
    const list = [...(radar?.candidates ?? [])];
    return list.sort((a, b) => (b.margin ?? -999) - (a.margin ?? -999));
  }, [radar?.candidates]);

  const marketLabel = marketFilter === "TW" ? "台股" : "美股";

  return (
    <div className="space-y-5">
      <AppHeader />

      {/* 總資產固定在首屏上方 */}
      <AssetHero />

      <SearchBar />

      <SegmentControl
        options={[
          { value: "TW" as const, label: "台股" },
          { value: "US" as const, label: "美股" },
        ]}
        value={marketFilter}
        onChange={setMarketFilter}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {marketLabel}低估排行榜
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              依「現價低於估值參考」幅度由高到低排序
            </p>
          </div>
          {radar ? (
            <p className="shrink-0 text-sm font-medium text-brand">
              {rankedCandidates.length} 檔
            </p>
          ) : null}
        </div>

        <p role="status" className="text-sm text-text-secondary">
          {error ??
            (busy
              ? "正在逐批核對財報與價格，排行榜會即時更新…"
              : "已完成本輪核對。通過價格條件仍需再看公司風險。")}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-brand/40 px-4 py-2 text-sm text-brand disabled:opacity-50"
            onClick={() => {
              setResult(null);
              setCursor(0);
              setNextCursor(0);
              setBusy(true);
              setError(null);
              setAttempt((n) => n + 1);
            }}
            disabled={busy}
          >
            重新讀取
          </button>
          {!busy && nextCursor != null ? (
            <button
              type="button"
              className="rounded-xl border border-brand/40 px-4 py-2 text-sm text-brand"
              onClick={() => {
                setCursor(nextCursor);
                setAttempt((n) => n + 1);
                setBusy(true);
                setError(null);
              }}
            >
              {error ? "重試未完成批次" : "繼續掃描更多（保留目前排行）"}
            </button>
          ) : null}
        </div>
      </section>

      {busy && rankedCandidates.length === 0 ? (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-10 text-center text-sm text-text-secondary">
          載入排行榜中…
        </div>
      ) : null}

      {!busy && rankedCandidates.length === 0 ? (
        <p className="rounded-2xl bg-bg-card-secondary/60 px-4 py-8 text-center text-sm text-text-secondary">
          目前尚無符合入場價格的股票。可點「繼續掃描更多」，或搜尋個股查看合理價。
        </p>
      ) : null}

      <ol className="space-y-3">
        {rankedCandidates.map((stock, index) => {
          const rank = index + 1;
          const margin = stock.margin ?? 0;
          return (
            <li key={stock.symbol}>
              <Link
                href={`/analysis?symbol=${encodeURIComponent(stock.symbol)}`}
                className="card-glass flex gap-3 rounded-2xl p-4 transition-colors hover:bg-bg-card-secondary/40"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                    rank <= 3
                      ? "bg-brand/15 text-brand"
                      : "bg-bg-card-secondary text-text-secondary"
                  )}
                >
                  {rank}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-primary">
                        {stock.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {stock.symbol}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-lg bg-success/10 px-2.5 py-1 text-right">
                      <p className="text-[10px] text-text-secondary">低估幅度</p>
                      <p className="text-sm font-bold text-success">
                        {margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-text-secondary">現價</p>
                      <p className="font-semibold text-text-primary">
                        {formatMoney(stock.price, stock.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">估值參考</p>
                      <p className="font-semibold text-brand">
                        {formatMoney(stock.fair, stock.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">保守買點</p>
                      <p className="font-semibold text-text-primary">
                        {formatMoney(stock.entry, stock.currency)}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-secondary">
                    本益比 {stock.pe.toFixed(1)} 倍 · 可點入查看完整合理價與財報
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <details className="glass-card rounded-2xl p-5 text-sm">
        <summary className="cursor-pointer text-brand">資料覆蓋與篩選方法</summary>
        <p className="mt-3">{radar?.description}</p>
        <p className="mt-2 text-text-secondary">{radar?.coverage}</p>
        <p className="mt-2">來源日期：{radar?.sourceDate ?? "讀取中"}</p>
      </details>

      {radar?.excluded && radar.excluded.length > 0 ? (
        <details className="rounded-2xl p-5 text-sm">
          <summary className="cursor-pointer text-brand">
            查看本次排除原因（{radar.excluded.length} 檔）
          </summary>
          {radar.excluded.map((x) => (
            <p key={x.symbol} className="mt-2 text-text-secondary">
              {x.symbol}：{x.reason}
            </p>
          ))}
        </details>
      ) : null}

      <p className="text-xs text-text-secondary">
        排行依低估幅度排序 · 估值與初篩不代表獲利機率。
      </p>
    </div>
  );
}

export default function HomePage() {
  const { marketFilter } = useMarketFilter();
  return <HomePageContent key={marketFilter} />;
}
