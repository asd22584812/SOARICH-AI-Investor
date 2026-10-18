"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { fetchStockAnalysis } from "@/lib/stock/api-client";
import { toWatchlistItem } from "@/lib/stock/watchlist";
import { WatchlistCards } from "@/components/home/watchlist-cards";
import { SearchBar } from "@/components/home/search-bar";
import type { WatchlistItem } from "@/types/stock";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [addSymbol, setAddSymbol] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    let tickers: string[] = [];
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("soarich-watchlist") ?? "[]");
      if (Array.isArray(stored)) tickers = stored.filter((s): s is string => typeof s === "string");
    } catch { /* Invalid local storage is treated as an empty user list. */ }
    Promise.all(tickers.map((ticker) => fetchStockAnalysis(ticker)))
      .then((analyses) => {
        if (cancelled) return;
        setWatchlist(
          analyses
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .map(toWatchlistItem)
        );
      })
      .catch(() => { if (!cancelled) setError("自選股資料讀取失敗，請稍後重試"); })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async () => {
    const trimmed = addSymbol.trim();
    if (!trimmed) return;

    setError("");
    const stock = await fetchStockAnalysis(trimmed);
    if (!stock) {
      setError("找不到這檔股票，請確認代號或名稱。");
      return;
    }
    if (watchlist.some((s) => s.symbol === stock.symbol)) {
      setError("已在自選股中");
      return;
    }
    const next = [...watchlist, toWatchlistItem(stock)];
    try { localStorage.setItem("soarich-watchlist", JSON.stringify(next.map((s) => s.symbol))); }
    catch { setError("無法儲存自選股，請確認瀏覽器儲存空間"); return; }
    setWatchlist(next);
    setAddSymbol("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">自選股</h1>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-full bg-brand/15 px-3.5 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/25"
        >
          <Plus className="h-3.5 w-3.5" />
          新增
        </button>
      </header>

      {showAdd && (
        <div className="glass-card space-y-3 rounded-2xl p-4">
          <input
            value={addSymbol}
            onChange={(e) => {
              setAddSymbol(e.target.value);
              setError("");
            }}
            placeholder="輸入代號或名稱"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-11 w-full rounded-xl bg-bg-card-secondary px-4 text-sm text-text-primary outline-none ring-1 ring-white/[0.06] focus:ring-brand/30"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="button"
            onClick={handleAdd}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-bg-primary"
          >
            加入自選股
          </button>
        </div>
      )}

      <SearchBar placeholder="搜尋代號或名稱..." />

      {loading ? (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-8 text-center text-sm text-text-secondary">
          載入自選股中...
        </div>
      ) : (
        <WatchlistCards items={watchlist} />
      )}
    </div>
  );
}
