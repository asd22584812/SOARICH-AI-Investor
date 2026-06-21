"use client";

import { Search } from "lucide-react";

interface StockSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function StockSearchField({
  value,
  onChange,
  onSubmit,
  placeholder = "搜尋代號或名稱",
  onFocus,
  onBlur,
}: StockSearchFieldProps) {
  const canSearch = value.trim().length > 0;

  return (
    <div className="stock-search-field">
      <Search className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder={placeholder}
        className="stock-search-input"
        aria-label="搜尋股票"
      />
      <button
        type="button"
        className="search-button"
        disabled={!canSearch}
        onClick={onSubmit}
        aria-label="搜尋"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        搜尋
      </button>
    </div>
  );
}
