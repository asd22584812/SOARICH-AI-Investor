import type {
  AIRecommendation,
  AssetOverview,
  Market,
  PortfolioSummary,
  StockAnalysis,
  StockQuote,
  WatchlistItem,
} from "@/types/stock";
import { getStockAnalysisFromEngine } from "@/lib/stock/analyzer";
import { getAllMockTickers, getMockStocksByMarket } from "@/lib/stock/mockData";
import { generateAssetHistory, generateSparkline } from "@/lib/chart-utils";

export const MOCK_ASSET_OVERVIEW: AssetOverview = {
  totalAssets: 1285320,
  dailyPnL: 12530,
  dailyPnLPercent: 1.25,
  currency: "TWD",
};

export function getAssetHistory7D() {
  return generateAssetHistory(MOCK_ASSET_OVERVIEW.totalAssets, 7, 42);
}

export function getAssetHistory30D() {
  return generateAssetHistory(MOCK_ASSET_OVERVIEW.totalAssets, 30, 17);
}

function buildAllStockAnalyses(): Record<string, StockAnalysis> {
  const analyses: Record<string, StockAnalysis> = {};
  for (const ticker of getAllMockTickers()) {
    const analysis = getStockAnalysisFromEngine(ticker);
    if (analysis) {
      analyses[analysis.symbol] = analysis;
    }
  }
  return analyses;
}

export const ALL_STOCKS: Record<string, StockAnalysis> = buildAllStockAnalyses();

export function getRecommendations(market: Market): AIRecommendation[] {
  return getMockStocksByMarket(market)
    .map((stock) => getStockAnalysisFromEngine(stock.ticker))
    .filter((analysis): analysis is StockAnalysis => analysis !== null)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 4)
    .map((analysis) => ({
      symbol: analysis.symbol,
      name: analysis.name,
      market: analysis.market,
      score: analysis.totalScore,
      buySignal: analysis.buySignal,
      price: analysis.price,
      fairPrice: analysis.valuation.fairPrice,
      undervaluedPercent: Math.max(
        0,
        Math.round(analysis.valuation.marginOfSafety)
      ),
      currency: analysis.currency,
    }));
}

export function getStockAnalysis(symbol: string): StockAnalysis | null {
  const upper = symbol.toUpperCase();
  return (
    getStockAnalysisFromEngine(upper) ??
    getStockAnalysisFromEngine(symbol) ??
    ALL_STOCKS[upper] ??
    ALL_STOCKS[symbol] ??
    null
  );
}

export function searchStocks(query: string, market?: Market): StockQuote[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return Object.values(ALL_STOCKS)
    .filter((s) => {
      if (market && s.market !== market) return false;
      return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    })
    .map(({ symbol, name, market, price, change, changePercent, currency }) => ({
      symbol,
      name,
      market,
      price,
      change,
      changePercent,
      currency,
    }));
}

export const DEFAULT_WATCHLIST: WatchlistItem[] = ["2330", "NVDA", "AAPL"]
  .map((ticker) => getStockAnalysis(ticker))
  .filter((stock): stock is StockAnalysis => stock !== null)
  .map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    currency: stock.currency,
    aiScore: stock.totalScore,
    buySignal: stock.buySignal,
    sparkline: generateSparkline(
      stock.symbol.charCodeAt(0) * 100,
      20,
      stock.changePercent >= 0 ? "up" : "down"
    ),
  }));

export const MOCK_PORTFOLIO: PortfolioSummary = {
  totalAssets: 1285320,
  totalReturn: 185320,
  totalReturnPercent: 16.84,
  dailyPnL: 12530,
  dailyPnLPercent: 1.25,
  currency: "TWD",
  holdings: [
    {
      symbol: "2330",
      name: "台積電",
      market: "TW",
      shares: 400,
      avgCost: 920,
      currentPrice: ALL_STOCKS["2330"]?.price ?? 1180,
      weight: 42,
      returnPercent: 28.3,
      industry: "半導體",
      country: "台灣",
    },
    {
      symbol: "NVDA",
      name: "NVIDIA",
      market: "US",
      shares: 60,
      avgCost: 88,
      currentPrice: ALL_STOCKS.NVDA?.price ?? 142,
      weight: 28,
      returnPercent: 61.4,
      industry: "半導體",
      country: "美國",
    },
    {
      symbol: "AAPL",
      name: "Apple",
      market: "US",
      shares: 80,
      avgCost: 185,
      currentPrice: ALL_STOCKS.AAPL?.price ?? 228.52,
      weight: 18,
      returnPercent: 23.5,
      industry: "科技",
      country: "美國",
    },
    {
      symbol: "2317",
      name: "鴻海",
      market: "TW",
      shares: 800,
      avgCost: 155,
      currentPrice: ALL_STOCKS["2317"]?.price ?? 178,
      weight: 12,
      returnPercent: 14.8,
      industry: "電子代工",
      country: "台灣",
    },
  ],
  byIndustry: [
    { name: "半導體", value: 70, color: "#C8A85D" },
    { name: "科技", value: 18, color: "#22C55E" },
    { name: "電子代工", value: 12, color: "#6366F1" },
  ],
  byCountry: [
    { name: "台灣", value: 54, color: "#C8A85D" },
    { name: "美國", value: 46, color: "#22C55E" },
  ],
};

// Re-export engine entry points for direct usage
export { analyzeStock, getStockAnalysisFromEngine } from "@/lib/stock/analyzer";
