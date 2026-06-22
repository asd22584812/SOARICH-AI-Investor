"use client";

import { useEffect, useState } from "react";
import type { AIRecommendation, Market, WatchlistItem } from "@/types/stock";
import { WATCHLIST_TICKERS } from "@/data/mock-data";
import {
  fetchRecommendations,
  fetchStockAnalysis,
} from "@/lib/stock/api-client";
import { toWatchlistItem } from "@/lib/stock/watchlist";
import { AssetHero } from "@/components/home/asset-hero";
import { SearchBar } from "@/components/home/search-bar";
import { RecommendationCarousel } from "@/components/home/recommendation-carousel";
import { WatchlistCards } from "@/components/home/watchlist-cards";
import { AppHeader } from "@/components/layout/app-header";
import { SegmentControl } from "@/components/ui/segment-control";

export default function HomePage() {
  const [market, setMarket] = useState<Market>("US");
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoadingRecommendations(true);
    fetchRecommendations(market)
      .then((items) => {
        if (!cancelled) setRecommendations(items);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecommendations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [market]);

  useEffect(() => {
    let cancelled = false;

    setLoadingWatchlist(true);
    Promise.all(WATCHLIST_TICKERS.map((ticker) => fetchStockAnalysis(ticker)))
      .then((analyses) => {
        if (cancelled) return;
        setWatchlist(
          analyses
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .map(toWatchlistItem)
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingWatchlist(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <AppHeader />

      <AssetHero />

      <SearchBar market={market} />

      <SegmentControl
        options={[
          { value: "TW" as Market, label: "台股" },
          { value: "US" as Market, label: "美股" },
        ]}
        value={market}
        onChange={setMarket}
      />

      {loadingRecommendations ? (
        <div className="rounded-2xl bg-bg-card-secondary/60 px-4 py-8 text-center text-sm text-text-secondary">
          載入 AI 推薦中...
        </div>
      ) : (
        <RecommendationCarousel recommendations={recommendations} compact />
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
