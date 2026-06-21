"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  DEFAULT_WATCHLIST,
  getStockAnalysis,
  toWatchlistItem,
} from "@/data/mock-data";
import { WatchlistCards } from "@/components/home/watchlist-cards";
import { SearchBar } from "@/components/home/search-bar";
import type { WatchlistItem } from "@/types/stock";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [addSymbol, setAddSymbol] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = () => {
    const stock = getStockAnalysis(addSymbol.trim());
    if (!stock) {
      setError("找不到這檔股票，請確認代號或名稱。");
      return;
    }
    if (watchlist.some((s) => s.symbol === stock.symbol)) {
      setError("已在自選股中");
      return;
    }
    setWatchlist((prev) => [...prev, toWatchlistItem(stock)]);
    setAddSymbol("");
    setError("");
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

      <WatchlistCards items={watchlist} />
    </div>
  );
}
