"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DEFAULT_WATCHLIST, getStockAnalysis } from "@/data/mock-data";
import { generateSparkline } from "@/lib/chart-utils";
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
      setError("找不到此股票");
      return;
    }
    if (watchlist.some((s) => s.symbol === stock.symbol)) {
      setError("已在自選股中");
      return;
    }
    setWatchlist((prev) => [
      ...prev,
      {
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
        currency: stock.currency,
        aiScore: stock.totalScore,
        buySignal: stock.buySignal,
        sparkline: generateSparkline(stock.symbol.charCodeAt(0) * 100, 20, "up"),
      },
    ]);
    setAddSymbol("");
    setError("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pt-1">
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
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <input
            value={addSymbol}
            onChange={(e) => {
              setAddSymbol(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="輸入股票代號"
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

      <SearchBar placeholder="搜尋自選股..." />

      <WatchlistCards items={watchlist} />
    </div>
  );
}
