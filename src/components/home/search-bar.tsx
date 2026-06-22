"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Market, StockQuote } from "@/types/stock";
import {
  fetchStockAnalysis,
  searchStocksApi,
  toStockQuoteFromSearch,
} from "@/lib/stock/api-client";
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
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StockQuote[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await searchStocksApi(trimmed, market);
        setResults(searchResults.map(toStockQuoteFromSearch));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, market]);

  const navigateToStock = (symbol: string) => {
    setQuery("");
    setNotFound(false);
    setFocused(false);
    router.push(`/analysis?symbol=${encodeURIComponent(symbol)}`);
  };

  const handleSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setNotFound(false);

    try {
      const analysis = await fetchStockAnalysis(trimmed);
      if (analysis) {
        navigateToStock(analysis.symbol);
        return;
      }

      setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
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

      {loading && query.trim() && (
        <p className="mt-2 text-xs text-text-secondary">搜尋中...</p>
      )}

      {notFound && query.trim() && !loading && (
        <p className="mt-2 text-xs text-danger">
          找不到這檔股票，請確認代號或名稱。
        </p>
      )}

      {focused && query && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card shadow-2xl">
          {results.map((stock) => (
            <Link
              key={`${stock.market}-${stock.symbol}`}
              href={`/analysis?symbol=${encodeURIComponent(stock.symbol)}`}
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
                {stock.price > 0
                  ? `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`
                  : "N/A"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
