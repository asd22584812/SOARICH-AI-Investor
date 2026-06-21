"use client";

import { useState } from "react";
import type { Market, WatchlistItem } from "@/types/stock";
import {
  getDefaultWatchlist,
  getRecommendations,
} from "@/data/mock-data";
import { AssetHero } from "@/components/home/asset-hero";
import { SearchBar } from "@/components/home/search-bar";
import { RecommendationCarousel } from "@/components/home/recommendation-carousel";
import { WatchlistCards } from "@/components/home/watchlist-cards";
import { AppHeader } from "@/components/layout/app-header";
import { SegmentControl } from "@/components/ui/segment-control";

export default function HomePage() {
  const [market, setMarket] = useState<Market>("US");
  const [watchlist] = useState<WatchlistItem[]>(getDefaultWatchlist);
  const recommendations = getRecommendations(market);

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

      <RecommendationCarousel recommendations={recommendations} compact />

      <WatchlistCards items={watchlist} compact />
    </div>
  );
}
