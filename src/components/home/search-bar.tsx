"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Market } from "@/types/stock";
import { resolveStockQuery, searchStocks } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { StockSearchField } from "./stock-search-field";

interface SearchBarProps {
  market?: Market;
  placeholder?: string;
}

export function SearchBar({
  market,
  placeholder = "搜尋代號或名稱（2330、台積電、NVDA）",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const results = searchStocks(query, market);

  const navigateToStock = (symbol: string) => {
    setQuery("");
    setNotFound(false);
    setFocused(false);
    router.push(`/analysis?symbol=${symbol}`);
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const stock = resolveStockQuery(trimmed, market);
    if (stock) {
      navigateToStock(stock.symbol);
      return;
    }

    setNotFound(true);
  };

  return (
    <div className="relative">
      <StockSearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setNotFound(false);
          }}
          onSubmit={handleSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
        />

      {notFound && query.trim() && (
        <p className="mt-2 text-xs text-danger">
          找不到這檔股票，請確認代號或名稱。
        </p>
      )}

      {focused && query && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card shadow-2xl">
          {results.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/analysis?symbol=${stock.symbol}`}
              className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-bg-card-secondary"
              onClick={() => {
                setQuery("");
                setNotFound(false);
              }}
            >
              <div>
                <span className="font-medium text-text-primary">{stock.symbol}</span>
                <span className="ml-2 text-sm text-text-secondary">{stock.name}</span>
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  stock.changePercent >= 0 ? "text-success" : "text-danger"
                )}
              >
                {stock.changePercent >= 0 ? "+" : ""}
                {stock.changePercent.toFixed(2)}%
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
