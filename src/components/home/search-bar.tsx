"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import type { Market } from "@/types/stock";
import { searchStocks } from "@/data/mock-data";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  market?: Market;
  placeholder?: string;
}

export function SearchBar({
  market,
  placeholder = "搜尋股票",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const results = searchStocks(query, market);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl bg-bg-card-secondary pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none ring-1 ring-white/[0.06] transition-all focus:ring-brand/30"
        />
      </div>
      {focused && query && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card shadow-2xl">
          {results.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/analysis?symbol=${stock.symbol}`}
              className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-bg-card-secondary"
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
