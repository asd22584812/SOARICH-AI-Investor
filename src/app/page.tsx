"use client";

import { useEffect, useState } from "react";
import type { HomeMarketFeed, WatchlistItem } from "@/types/stock";
import {
  fetchHomeMarketFeed,
  fetchPopularStocks,
} from "@/lib/stock/api-client";
import { AssetHero } from "@/components/home/asset-hero";
import { SearchBar } from "@/components/home/search-bar";
import { HomeStockSection } from "@/components/home/home-stock-section";
import { WatchlistCards } from "@/components/home/watchlist-cards";
import { AppHeader } from "@/components/layout/app-header";
import { SegmentControl } from "@/components/ui/segment-control";
import { useMarketFilter } from "@/contexts/market-filter-context";

const EMPTY_FEED: HomeMarketFeed = {
  todayFocus: [],
  undervalued: [],
  highQuality: [],
  moat: [],
};

function HomePageContent() {
  const { marketFilter, setMarketFilter, labels } = useMarketFilter();
  const [feed, setFeed] = useState<HomeMarketFeed>(EMPTY_FEED);
  const [sectionCounts, setSectionCounts] = useState({
    todayFocus: 0,
    undervalued: 0,
    highQuality: 0,
    moat: 0,
  });
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoadingFeed(true);
    fetchHomeMarketFeed(marketFilter)
      .then((result) => {
        if (cancelled) return;
        setFeed(result.feed);
        setSectionCounts(result.sectionCounts);
        setScanning(result.scanning);
        setScanMessage(result.message ?? null);
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

    setLoadingWatchlist(true);
    fetchPopularStocks(marketFilter, 20)
      .then((result) => {
        if (cancelled) return;
        setWatchlist(result.items);
        if (result.scanning) {
          setScanning(true);
          setScanMessage(result.message ?? "正在更新市場資料");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingWatchlist(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketFilter]);

  const sectionSubtitle = (count: number) =>
    scanning ? null : count > 0 ? `${count} 檔` : "0 檔";

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

      {scanning && (
        <div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-center text-sm text-brand">
          {scanMessage ?? "正在更新市場資料"}
        </div>
      )}

      {loadingFeed ? (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-8 text-center text-sm text-text-secondary">
          載入市場資料中...
        </div>
      ) : (
        <>
          <HomeStockSection
            title={labels.todayFocus}
            subtitle={sectionSubtitle(sectionCounts.todayFocus)}
            items={feed.todayFocus}
            compact
            showUndervaluedBadge
          />
          <HomeStockSection
            title={labels.undervalued}
            subtitle={sectionSubtitle(sectionCounts.undervalued)}
            items={feed.undervalued}
            compact
            showUndervaluedBadge
          />
          <HomeStockSection
            title={labels.highQuality}
            subtitle={sectionSubtitle(sectionCounts.highQuality)}
            items={feed.highQuality}
            compact
          />
          <HomeStockSection
            title={labels.moat}
            subtitle={sectionSubtitle(sectionCounts.moat)}
            items={feed.moat}
            compact
          />
        </>
      )}

      {loadingWatchlist ? (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-8 text-center text-sm text-text-secondary">
          載入熱門股票中...
        </div>
      ) : (
        <WatchlistCards items={watchlist} compact horizontal />
      )}
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
