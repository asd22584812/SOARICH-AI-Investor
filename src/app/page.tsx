"use client";

import { useEffect, useState } from "react";
import type { HomeMarketFeed, WatchlistItem } from "@/types/stock";
import {
  TW_WATCHLIST_TICKERS,
  US_WATCHLIST_TICKERS,
} from "@/data/mock-data";
import { fetchHomeMarketFeed, fetchStockAnalysis } from "@/lib/stock/api-client";
import { matchesMarketFilter } from "@/lib/stock/market-filter";
import { toWatchlistItem } from "@/lib/stock/watchlist";
import { AssetHero } from "@/components/home/asset-hero";
import { SearchBar } from "@/components/home/search-bar";
import { HomeStockSection } from "@/components/home/home-stock-section";
import { WatchlistCards } from "@/components/home/watchlist-cards";
import { AppHeader } from "@/components/layout/app-header";
import { SegmentControl } from "@/components/ui/segment-control";
import {
  useMarketFilter,
} from "@/contexts/market-filter-context";

function HomePageContent() {
  const { marketFilter, setMarketFilter, labels } = useMarketFilter();
  const [feed, setFeed] = useState<HomeMarketFeed>({
    todayFocus: [],
    undervalued: [],
    highQuality: [],
    moat: [],
  });
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoadingFeed(true);
    fetchHomeMarketFeed(marketFilter)
      .then((items) => {
        if (!cancelled) setFeed(items);
      })
      .finally(() => {
        if (!cancelled) setLoadingFeed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketFilter]);

  useEffect(() => {
    let cancelled = false;
    const tickers =
      marketFilter === "TW" ? TW_WATCHLIST_TICKERS : US_WATCHLIST_TICKERS;

    setLoadingWatchlist(true);
    Promise.all(tickers.map((ticker) => fetchStockAnalysis(ticker)))
      .then((analyses) => {
        if (cancelled) return;
        setWatchlist(
          analyses
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .filter((item) => matchesMarketFilter(item, marketFilter))
            .map(toWatchlistItem)
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingWatchlist(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketFilter]);

  return (
    <div className="space-y-5">
      <AppHeader />

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

      {loadingFeed ? (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-8 text-center text-sm text-text-secondary">
          載入市場資料中...
        </div>
      ) : (
        <>
          <HomeStockSection
            title={labels.todayFocus}
            items={feed.todayFocus}
            compact
            showUndervaluedBadge
          />
          <HomeStockSection
            title={labels.undervalued}
            items={feed.undervalued}
            compact
            showUndervaluedBadge
          />
          <HomeStockSection
            title={labels.highQuality}
            items={feed.highQuality}
            compact
          />
          <HomeStockSection
            title={labels.moat}
            items={feed.moat}
            compact
          />
        </>
      )}

      {loadingWatchlist ? (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-8 text-center text-sm text-text-secondary">
          載入自選股中...
        </div>
      ) : (
        <WatchlistCards items={watchlist} compact />
      )}
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
