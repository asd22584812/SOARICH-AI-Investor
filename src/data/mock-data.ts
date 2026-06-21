import type {
  AIRecommendation,
  AssetOverview,
  Market,
  PortfolioSummary,
  StockAnalysis,
  StockQuote,
  WatchlistItem,
} from "@/types/stock";
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

const twStocks: Record<string, StockAnalysis> = {
  "2330": {
    symbol: "2330",
    name: "台積電",
    market: "TW",
    price: 1180,
    change: 14,
    changePercent: 1.2,
    currency: "TWD",
    totalScore: 92,
    buySignal: "good_buy",
    aiScore: { moat: 95, financials: 92, growth: 85, management: 90, valuation: 88 },
    valuation: {
      safetyPrice: 980,
      fairPrice: 1280,
      optimisticPrice: 1520,
      dcfValue: 1240,
      marginOfSafety: 18.0,
    },
    moat: {
      score: 95,
      brand: 92,
      technology: 98,
      networkEffect: 88,
      scaleEconomy: 96,
      switchingCost: 94,
      summary: "全球晶圓代工龍頭，先進製程與規模經濟構成深厚護城河。",
    },
    keyPersonRisk: {
      level: "low",
      ceo: "魏哲家 — 技術背景深厚，接班規劃明確，領導力穩健。",
      founder: "張忠謀已退居幕後，企業制度與文化已成熟定型。",
      succession: "接班人選經長期培養，治理制度完善。",
      teamMaturity: "研發與營運團隊分工清晰，管理層穩定。",
    },
    buffett: {
      score: 86,
      roe: 28,
      freeCashFlow: 92,
      debtRatio: 18,
      moat: 95,
      profitStability: 90,
      summary: "高 ROE、強勁自由現金流、低負債，符合巴菲特式優質企業。",
    },
    aiConclusion: {
      isUndervalued: true,
      suitableForDCA: true,
      undervaluedPercent: 8,
      highlights: ["護城河強", "未來三年成長性佳", "可考慮分批布局"],
      mainRisks: ["地緣政治", "半導體景氣循環"],
      growthOutlook: "AI 晶片需求持續強勁，先進製程領先優勢可望延續。",
      summary: "全球晶圓代工龍頭，目前股價低於合理價，適合長期投資者分批布局。",
    },
  },
  "2317": {
    symbol: "2317",
    name: "鴻海",
    market: "TW",
    price: 178,
    change: -2.5,
    changePercent: -1.38,
    currency: "TWD",
    totalScore: 72,
    buySignal: "watch",
    aiScore: { moat: 68, financials: 75, growth: 70, management: 72, valuation: 74 },
    valuation: {
      safetyPrice: 150,
      fairPrice: 195,
      optimisticPrice: 230,
      dcfValue: 188,
      marginOfSafety: 8.5,
    },
    moat: {
      score: 68,
      brand: 70,
      technology: 65,
      networkEffect: 60,
      scaleEconomy: 78,
      switchingCost: 72,
      summary: "規模經濟與供應鏈整合為主要優勢，代工業競爭激烈。",
    },
    keyPersonRisk: {
      level: "medium",
      ceo: "劉揚偉 — 推動轉型中，電動車策略仍在驗證期。",
      founder: "郭台銘影響力仍存，公司治理需持續觀察。",
      succession: "接班制度已建立，文化延續性有待觀察。",
      teamMaturity: "事業群龐大，跨部門協調為挑戰。",
    },
    buffett: {
      score: 68,
      roe: 12,
      freeCashFlow: 70,
      debtRatio: 45,
      moat: 65,
      profitStability: 72,
      summary: "現金流穩定但 ROE 中等，負債比偏高。",
    },
    aiConclusion: {
      isUndervalued: false,
      suitableForDCA: true,
      undervaluedPercent: 5,
      highlights: ["估值合理", "電動車為潛在催化劑"],
      mainRisks: ["蘋果訂單依賴", "電動車投資回報"],
      growthOutlook: "AI 伺服器與電動車為新成長動能。",
      summary: "建議觀察電動車業務進展，可小額分批試單。",
    },
  },
};

const usStocks: Record<string, StockAnalysis> = {
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA",
    market: "US",
    price: 142,
    change: 3.5,
    changePercent: 2.53,
    currency: "USD",
    totalScore: 91,
    buySignal: "good_buy",
    aiScore: { moat: 94, financials: 90, growth: 96, management: 88, valuation: 85 },
    valuation: {
      safetyPrice: 115,
      fairPrice: 185,
      optimisticPrice: 220,
      dcfValue: 175,
      marginOfSafety: 23.2,
    },
    moat: {
      score: 94,
      brand: 95,
      technology: 98,
      networkEffect: 92,
      scaleEconomy: 90,
      switchingCost: 93,
      summary: "CUDA 生態系與 AI 晶片領導地位形成強大技術壁壘。",
    },
    keyPersonRisk: {
      level: "low",
      ceo: "黃仁勳 — 創辦人兼 CEO，願景清晰、執行力極強。",
      founder: "創辦人仍在掌舵，戰略連貫性高。",
      succession: "尚未明確接班計畫，公司仍處高成長期。",
      teamMaturity: "研發人才密度業界頂尖，高層團隊穩定。",
    },
    buffett: {
      score: 78,
      roe: 115,
      freeCashFlow: 88,
      debtRatio: 22,
      moat: 94,
      profitStability: 75,
      summary: "ROE 極高，成長性彌補部分估值溢價。",
    },
    aiConclusion: {
      isUndervalued: true,
      suitableForDCA: true,
      undervaluedPercent: 23,
      highlights: ["護城河強", "未來三年成長性佳", "可考慮分批布局"],
      mainRisks: ["估值波動", "競爭對手追趕"],
      growthOutlook: "AI 基礎建設需求爆發，GPU 需求持續成長。",
      summary: "AI 浪潮核心受益者，股價具安全邊際，建議分批布局。",
    },
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple",
    market: "US",
    price: 228.52,
    change: -1.15,
    changePercent: -0.5,
    currency: "USD",
    totalScore: 84,
    buySignal: "good_buy",
    aiScore: { moat: 92, financials: 88, growth: 72, management: 90, valuation: 78 },
    valuation: {
      safetyPrice: 195,
      fairPrice: 245,
      optimisticPrice: 285,
      dcfValue: 238,
      marginOfSafety: 12.8,
    },
    moat: {
      score: 92,
      brand: 98,
      technology: 85,
      networkEffect: 90,
      scaleEconomy: 88,
      switchingCost: 95,
      summary: "品牌力與生態系鎖定效應為核心護城河。",
    },
    keyPersonRisk: {
      level: "low",
      ceo: "Tim Cook — 營運能力卓越，供應鏈管理出色。",
      founder: "Steve Jobs 精神仍影響產品文化。",
      succession: "接班人選已在培養，公司治理成熟。",
      teamMaturity: "全球頂尖管理團隊，分工明確。",
    },
    buffett: {
      score: 88,
      roe: 160,
      freeCashFlow: 95,
      debtRatio: 35,
      moat: 92,
      profitStability: 94,
      summary: "巴菲特持倉標的，現金流與獲利穩定性極佳。",
    },
    aiConclusion: {
      isUndervalued: true,
      suitableForDCA: true,
      undervaluedPercent: 7,
      highlights: ["獲利穩定", "生態系護城河", "適合長期持有"],
      mainRisks: ["中國市場", "創新放緩"],
      growthOutlook: "服務業務與 AI 整合為新成長點。",
      summary: "優質藍籌股，估值合理偏低，適合穩健型投資者。",
    },
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet",
    market: "US",
    price: 178.35,
    change: 2.1,
    changePercent: 1.19,
    currency: "USD",
    totalScore: 82,
    buySignal: "watch",
    aiScore: { moat: 88, financials: 85, growth: 80, management: 78, valuation: 80 },
    valuation: {
      safetyPrice: 155,
      fairPrice: 195,
      optimisticPrice: 235,
      dcfValue: 190,
      marginOfSafety: 10.2,
    },
    moat: {
      score: 88,
      brand: 90,
      technology: 92,
      networkEffect: 95,
      scaleEconomy: 85,
      switchingCost: 80,
      summary: "搜尋與廣告壟斷地位，YouTube 與雲端強化生態系。",
    },
    keyPersonRisk: {
      level: "medium",
      ceo: "Sundar Pichai — 技術背景強，面臨 AI 轉型壓力。",
      founder: "創辦人已退居二線，影響力間接。",
      succession: "接班規劃不夠透明。",
      teamMaturity: "人才流失為近期隱憂。",
    },
    buffett: {
      score: 80,
      roe: 28,
      freeCashFlow: 90,
      debtRatio: 12,
      moat: 88,
      profitStability: 85,
      summary: "低負債、強現金流，獲利穩定。",
    },
    aiConclusion: {
      isUndervalued: false,
      suitableForDCA: true,
      undervaluedPercent: 3,
      highlights: ["搜尋壟斷地位", "雲端業務成長"],
      mainRisks: ["AI 競爭", "反壟斷監管"],
      growthOutlook: "Gemini AI 與雲端為關鍵成長引擎。",
      summary: "估值合理，建議觀察 AI 產品化進展。",
    },
  },
};

export const ALL_STOCKS: Record<string, StockAnalysis> = {
  ...twStocks,
  ...usStocks,
};

export const TW_RECOMMENDATIONS: AIRecommendation[] = [
  { symbol: "2330", name: "台積電", market: "TW", score: 92, buySignal: "good_buy", price: 1180, fairPrice: 1280, undervaluedPercent: 8, currency: "TWD" },
  { symbol: "2454", name: "聯發科", market: "TW", score: 79, buySignal: "good_buy", price: 1285, fairPrice: 1420, undervaluedPercent: 10, currency: "TWD" },
  { symbol: "2308", name: "台達電", market: "TW", score: 76, buySignal: "watch", price: 385, fairPrice: 410, undervaluedPercent: 6, currency: "TWD" },
  { symbol: "2317", name: "鴻海", market: "TW", score: 72, buySignal: "watch", price: 178, fairPrice: 195, undervaluedPercent: 9, currency: "TWD" },
];

export const US_RECOMMENDATIONS: AIRecommendation[] = [
  { symbol: "NVDA", name: "NVIDIA", market: "US", score: 91, buySignal: "good_buy", price: 142, fairPrice: 185, undervaluedPercent: 23, currency: "USD" },
  { symbol: "MSFT", name: "Microsoft", market: "US", score: 87, buySignal: "good_buy", price: 415, fairPrice: 460, undervaluedPercent: 10, currency: "USD" },
  { symbol: "AAPL", name: "Apple", market: "US", score: 84, buySignal: "good_buy", price: 228, fairPrice: 245, undervaluedPercent: 7, currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet", market: "US", score: 82, buySignal: "watch", price: 178, fairPrice: 195, undervaluedPercent: 9, currency: "USD" },
];

export function getRecommendations(market: Market): AIRecommendation[] {
  return market === "TW" ? TW_RECOMMENDATIONS : US_RECOMMENDATIONS;
}

export function getStockAnalysis(symbol: string): StockAnalysis | null {
  const upper = symbol.toUpperCase();
  return ALL_STOCKS[upper] ?? ALL_STOCKS[symbol] ?? null;
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
      symbol, name, market, price, change, changePercent, currency,
    }));
}

export const DEFAULT_WATCHLIST: WatchlistItem[] = [
  {
    symbol: "2330", name: "台積電", market: "TW", price: 1180, change: 14, changePercent: 1.2,
    currency: "TWD", aiScore: 92, buySignal: "good_buy",
    sparkline: generateSparkline(2330, 20, "up"),
  },
  {
    symbol: "NVDA", name: "NVIDIA", market: "US", price: 142, change: 3.5, changePercent: 2.53,
    currency: "USD", aiScore: 91, buySignal: "good_buy",
    sparkline: generateSparkline(1001, 20, "up"),
  },
  {
    symbol: "AAPL", name: "Apple", market: "US", price: 228.52, change: -1.15, changePercent: -0.5,
    currency: "USD", aiScore: 84, buySignal: "good_buy",
    sparkline: generateSparkline(2002, 20, "down"),
  },
];

export const MOCK_PORTFOLIO: PortfolioSummary = {
  totalAssets: 1285320,
  totalReturn: 185320,
  totalReturnPercent: 16.84,
  dailyPnL: 12530,
  dailyPnLPercent: 1.25,
  currency: "TWD",
  holdings: [
    { symbol: "2330", name: "台積電", market: "TW", shares: 400, avgCost: 920, currentPrice: 1180, weight: 42, returnPercent: 28.3, industry: "半導體", country: "台灣" },
    { symbol: "NVDA", name: "NVIDIA", market: "US", shares: 60, avgCost: 88, currentPrice: 142, weight: 28, returnPercent: 61.4, industry: "半導體", country: "美國" },
    { symbol: "AAPL", name: "Apple", market: "US", shares: 80, avgCost: 185, currentPrice: 228.52, weight: 18, returnPercent: 23.5, industry: "科技", country: "美國" },
    { symbol: "2317", name: "鴻海", market: "TW", shares: 800, avgCost: 155, currentPrice: 178, weight: 12, returnPercent: 14.8, industry: "電子代工", country: "台灣" },
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
