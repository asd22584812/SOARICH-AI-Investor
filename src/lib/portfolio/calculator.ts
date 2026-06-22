import type {
  AllocationSlice,
  ComputedPortfolio,
  CurrencyTotals,
  PortfolioHolding,
  PortfolioPosition,
} from "@/types/stock";
import { fetchStockAnalysis } from "@/lib/stock/api-client";

const CHART_COLORS = [
  "#C8A85D",
  "#22C55E",
  "#6366F1",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
];

/** 僅用於跨幣別配置圖表加總 */
const USD_TO_TWD_FOR_ALLOCATION = 32;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildAllocation(
  entries: Array<{ name: string; amount: number }>
): AllocationSlice[] {
  const total = entries.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return [];

  return entries
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      name: item.name,
      value: round1((item.amount / total) * 100),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
}

function sumCurrencyTotals(holdings: PortfolioHolding[]): CurrencyTotals {
  const totalAssets = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
  const unrealizedPnL = totalAssets - totalCost;
  const dailyPnL = holdings.reduce((sum, h) => sum + h.dailyPnL, 0);
  const returnPercent =
    totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;
  const dailyPnLPercent =
    totalAssets - dailyPnL > 0 ? (dailyPnL / (totalAssets - dailyPnL)) * 100 : 0;

  return {
    totalAssets,
    totalCost,
    unrealizedPnL,
    returnPercent,
    dailyPnL,
    dailyPnLPercent,
  };
}

export async function computePortfolio(
  positions: PortfolioPosition[]
): Promise<ComputedPortfolio | null> {
  if (positions.length === 0) return null;

  const enriched = await Promise.all(
    positions.map(async (position) => {
      const analysis = await fetchStockAnalysis(position.symbol);
      if (!analysis) return null;

      const marketValue = position.shares * analysis.price;
      const costBasis = position.shares * position.avgCost;
      const unrealizedPnL = marketValue - costBasis;
      const returnPercent =
        position.avgCost > 0
          ? ((analysis.price - position.avgCost) / position.avgCost) * 100
          : 0;
      const dailyPnL = position.shares * analysis.change;

      const holding: PortfolioHolding = {
        id: position.id,
        symbol: analysis.symbol,
        name: analysis.name,
        market: analysis.market,
        shares: position.shares,
        avgCost: position.avgCost,
        currentPrice: analysis.price,
        weight: 0,
        returnPercent,
        unrealizedPnL,
        marketValue,
        dailyPnL,
        currency: analysis.currency,
        industry: analysis.industry ?? "未分類",
        country: analysis.market === "TW" ? "台灣" : "美國",
      };

      return holding;
    })
  );

  const holdings = enriched.filter(
    (item): item is PortfolioHolding => item !== null
  );

  if (holdings.length === 0) return null;

  const twdHoldings = holdings.filter((h) => h.currency === "TWD");
  const usdHoldings = holdings.filter((h) => h.currency === "USD");
  const hasMixedCurrency = twdHoldings.length > 0 && usdHoldings.length > 0;

  const allocationBase = holdings.reduce((sum, holding) => {
    const baseValue =
      holding.currency === "USD"
        ? holding.marketValue * USD_TO_TWD_FOR_ALLOCATION
        : holding.marketValue;
    return sum + baseValue;
  }, 0);

  const weightedHoldings = holdings.map((holding) => {
    const baseValue =
      holding.currency === "USD"
        ? holding.marketValue * USD_TO_TWD_FOR_ALLOCATION
        : holding.marketValue;
    return {
      ...holding,
      weight: allocationBase > 0 ? round1((baseValue / allocationBase) * 100) : 0,
    };
  });

  const totalsByCurrency: ComputedPortfolio["totalsByCurrency"] = {};
  if (twdHoldings.length > 0) {
    totalsByCurrency.TWD = sumCurrencyTotals(
      weightedHoldings.filter((h) => h.currency === "TWD")
    );
  }
  if (usdHoldings.length > 0) {
    totalsByCurrency.USD = sumCurrencyTotals(
      weightedHoldings.filter((h) => h.currency === "USD")
    );
  }

  const industryMap = new Map<string, number>();
  const countryMap = new Map<string, number>();

  for (const holding of weightedHoldings) {
    const baseValue =
      holding.currency === "USD"
        ? holding.marketValue * USD_TO_TWD_FOR_ALLOCATION
        : holding.marketValue;

    industryMap.set(
      holding.industry,
      (industryMap.get(holding.industry) ?? 0) + baseValue
    );
    countryMap.set(
      holding.country,
      (countryMap.get(holding.country) ?? 0) + baseValue
    );
  }

  return {
    holdings: weightedHoldings,
    totalsByCurrency,
    bySymbol: buildAllocation(
      weightedHoldings.map((h) => ({
        name: h.symbol,
        amount:
          h.currency === "USD"
            ? h.marketValue * USD_TO_TWD_FOR_ALLOCATION
            : h.marketValue,
      }))
    ),
    byIndustry: buildAllocation(
      [...industryMap.entries()].map(([name, amount]) => ({ name, amount }))
    ),
    byCountry: buildAllocation(
      [...countryMap.entries()].map(([name, amount]) => ({ name, amount }))
    ),
    displayCurrency: twdHoldings.length > 0 ? "TWD" : "USD",
    hasMixedCurrency,
  };
}
