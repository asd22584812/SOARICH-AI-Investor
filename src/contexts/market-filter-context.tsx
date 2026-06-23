"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getHomeSectionLabels,
  type MarketFilter,
} from "@/lib/stock/market-filter";

interface MarketFilterContextValue {
  marketFilter: MarketFilter;
  setMarketFilter: (filter: MarketFilter) => void;
  labels: ReturnType<typeof getHomeSectionLabels>;
}

const MarketFilterContext = createContext<MarketFilterContextValue | null>(null);

export function MarketFilterProvider({ children }: { children: ReactNode }) {
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("US");

  const value = useMemo(
    () => ({
      marketFilter,
      setMarketFilter,
      labels: getHomeSectionLabels(marketFilter),
    }),
    [marketFilter]
  );

  return (
    <MarketFilterContext.Provider value={value}>
      {children}
    </MarketFilterContext.Provider>
  );
}

export function useMarketFilter(): MarketFilterContextValue {
  const context = useContext(MarketFilterContext);
  if (!context) {
    throw new Error("useMarketFilter must be used within MarketFilterProvider");
  }
  return context;
}
