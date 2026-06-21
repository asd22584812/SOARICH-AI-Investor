"use client";

import { useState } from "react";
import type { Market, WatchlistItem } from "@/types/stock";
import {
  DEFAULT_WATCHLIST,
  getRecommendations,
} from "@/data/mock-data";
import { AssetHero } from "@/components/home/asset-hero";
import { SearchBar } from "@/components/home/search-bar";
import { RecommendationCarousel } from "@/components/home/recommendation-carousel";
import { WatchlistCards } from "@/components/home/watchlist-cards";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SegmentControl } from "@/components/ui/segment-control";

export default function HomePage() {
  const [market, setMarket] = useState<Market>("US");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const recommendations = getRecommendations(market);

  return (
    <div className="space-y-7">
      <header className="pt-1">
        <BrandLogo />
      </header>

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

      <RecommendationCarousel recommendations={recommendations} />

      <WatchlistCards items={watchlist} />
    </div>
  );
}
