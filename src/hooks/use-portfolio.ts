"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ComputedPortfolio,
  PortfolioPosition,
} from "@/types/stock";
import { computePortfolio } from "@/lib/portfolio/calculator";
import {
  createPositionId,
  loadPortfolio,
  savePortfolio,
} from "@/lib/portfolio/storage";

export function usePortfolio() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [computed, setComputed] = useState<ComputedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPositions(loadPortfolio().positions);
    setHydrated(true);
  }, []);

  const refreshComputed = useCallback(async (nextPositions: PortfolioPosition[]) => {
    if (nextPositions.length === 0) {
      setComputed(null);
      return;
    }

    setRefreshing(true);
    try {
      const result = await computePortfolio(nextPositions);
      setComputed(result);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (positions.length === 0) {
      setComputed(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    refreshComputed(positions).finally(() => setLoading(false));
  }, [positions, hydrated, refreshComputed]);

  const persist = useCallback((next: PortfolioPosition[]) => {
    setPositions(next);
    savePortfolio(next);
  }, []);

  const addPosition = useCallback(
    (input: Omit<PortfolioPosition, "id">) => {
      const next = [
        ...positions,
        {
          ...input,
          id: createPositionId(),
          symbol: input.symbol.trim().toUpperCase(),
        },
      ];
      persist(next);
    },
    [positions, persist]
  );

  const updatePosition = useCallback(
    (id: string, input: Omit<PortfolioPosition, "id">) => {
      const next = positions.map((position) =>
        position.id === id
          ? {
              ...input,
              id,
              symbol: input.symbol.trim().toUpperCase(),
            }
          : position
      );
      persist(next);
    },
    [positions, persist]
  );

  const removePosition = useCallback(
    (id: string) => {
      persist(positions.filter((position) => position.id !== id));
    },
    [positions, persist]
  );

  const reload = useCallback(() => {
    if (positions.length === 0) return;
    refreshComputed(positions);
  }, [positions, refreshComputed]);

  return {
    positions,
    computed,
    loading,
    refreshing,
    addPosition,
    updatePosition,
    removePosition,
    reload,
  };
}
