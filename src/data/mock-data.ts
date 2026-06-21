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

export const WATCHLIST_TICKERS = ["2330", "NVDA", "AAPL"] as const;

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

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function stockMatchScore(stock: StockAnalysis, query: string): number {
  const q = normalizeQuery(query);
  if (!q) return 0;

  const symbol = stock.symbol.toLowerCase();
  const name = stock.name.toLowerCase();

  if (symbol === q || name === q) return 100;
  if (symbol === q.toUpperCase()) return 100;
  if (symbol.startsWith(q) || name.startsWith(q)) return 80;
  if (symbol.includes(q) || name.includes(q)) return 60;
  return 0;
}

export function resolveStockQuery(
  query: string,
  market?: Market
): StockAnalysis | null {
  const q = normalizeQuery(query);
  if (!q) return null;

  const stocks = Object.values(ALL_STOCKS).filter(
    (stock) => !market || stock.market === market
  );

  const ranked = stocks
    .map((stock) => ({ stock, score: stockMatchScore(stock, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.stock ?? null;
}

export function getRecommendations(market: Market): AIRecommendation[] {
  return getMockStocksByMarket(market)
    .map((stock) => getStockAnalysisFromEngine(stock.ticker))
    .filter((analysis): analysis is StockAnalysis => analysis !== null)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5)
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
  return resolveStockQuery(symbol);
}

export function searchStocks(query: string, market?: Market): StockQuote[] {
  const q = normalizeQuery(query);
  if (!q) return [];

  return Object.values(ALL_STOCKS)
    .filter((stock) => !market || stock.market === market)
    .map((stock) => ({ stock, score: stockMatchScore(stock, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ stock }) => ({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      price: stock.price,
      change: stock.change,
      changePercent: stock.changePercent,
      currency: stock.currency,
    }));
}

export function toWatchlistItem(stock: StockAnalysis): WatchlistItem {
  return {
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
  };
}

export function getDefaultWatchlist(): WatchlistItem[] {
  return WATCHLIST_TICKERS.map((ticker) => getStockAnalysis(ticker))
    .filter((stock): stock is StockAnalysis => stock !== null)
    .map(toWatchlistItem);
}

export const DEFAULT_WATCHLIST: WatchlistItem[] = getDefaultWatchlist();

function buildPortfolioHolding(
  symbol: string,
  shares: number,
  avgCost: number,
  weight: number,
  returnPercent: number,
  industry: string,
  country: string
) {
  const stock = ALL_STOCKS[symbol];
  if (!stock) return null;

  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    shares,
    avgCost,
    currentPrice: stock.price,
    weight,
    returnPercent,
    industry,
    country,
  };
}

export const MOCK_PORTFOLIO: PortfolioSummary = {
  totalAssets: MOCK_ASSET_OVERVIEW.totalAssets,
  totalReturn: 185320,
  totalReturnPercent: 16.84,
  dailyPnL: MOCK_ASSET_OVERVIEW.dailyPnL,
  dailyPnLPercent: MOCK_ASSET_OVERVIEW.dailyPnLPercent,
  currency: "TWD",
  holdings: [
    buildPortfolioHolding("2330", 400, 920, 42, 28.3, "半導體", "台灣"),
    buildPortfolioHolding("NVDA", 60, 88, 28, 61.4, "半導體", "美國"),
    buildPortfolioHolding("AAPL", 80, 185, 18, 23.5, "科技", "美國"),
    buildPortfolioHolding("2317", 800, 155, 12, 14.8, "電子代工", "台灣"),
  ].filter((holding): holding is NonNullable<typeof holding> => holding !== null),
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

export { analyzeStock, getStockAnalysisFromEngine } from "@/lib/stock/analyzer";
