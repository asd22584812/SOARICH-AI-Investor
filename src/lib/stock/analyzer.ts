import type {
  AIConclusion,
  BuffettScore,
  BuySignal,
  KeyPersonRisk,
  StockAnalysis,
} from "@/types/stock";
import { calculateMoatScore } from "./moat";
import { getMockStock } from "./mockData";
import { getBuySignal } from "./signal";
import type {
  StockAnalysisResult,
  StockFinancials,
  StockInput,
} from "./types";
import { calculateFairValue } from "./valuation";

function toFinancials(stock: StockInput): StockFinancials {
  return {
    eps: stock.eps,
    bookValuePerShare: stock.bookValuePerShare,
    freeCashFlowPerShare: stock.freeCashFlowPerShare,
    growthRate: stock.growthRate,
    roe: stock.roe,
    roa: stock.roa,
    grossMargin: stock.grossMargin,
    operatingMargin: stock.operatingMargin,
    debtToEquity: stock.debtToEquity,
    pe: stock.pe,
    pb: stock.pb,
    peg: stock.peg,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateFinancialScore(stock: StockInput): number {
  const roeScore = Math.min(stock.roe, 40) * 1.8;
  const roaScore = Math.min(stock.roa, 25) * 2.4;
  const marginScore = stock.operatingMargin * 1.2;
  const debtPenalty = Math.min(stock.debtToEquity, 2) * 12;
  return clampScore(roeScore * 0.35 + roaScore * 0.25 + marginScore * 0.3 - debtPenalty);
}

function calculateGrowthScore(stock: StockInput): number {
  return clampScore(stock.growthRate * 2.8 + stock.grossMargin * 0.35);
}

function calculateBuffettScore(
  stock: StockInput,
  moatScore: number,
  financialScore: number
): number {
  const fcfYield =
    stock.currentPrice > 0
      ? (stock.freeCashFlowPerShare / stock.currentPrice) * 100
      : 0;
  const debtScore = clampScore(100 - stock.debtToEquity * 25);
  const profitStability = clampScore(financialScore * 0.85 + stock.operatingMargin);

  return clampScore(
    Math.min(stock.roe, 50) * 0.35 +
      fcfYield * 8 +
      debtScore * 0.2 +
      moatScore * 0.25 +
      profitStability * 0.2
  );
}

function buildMoatSummary(moatScore: number, name: string): string {
  if (moatScore >= 90) {
    return `${name}具備極強護城河，技術與規模優勢難以複製。`;
  }
  if (moatScore >= 75) {
    return `${name}擁有穩固競爭優勢，長期市場地位相對穩健。`;
  }
  if (moatScore >= 60) {
    return `${name}具備一定護城河，但產業競爭仍帶來壓力。`;
  }
  return `${name}護城河有限，需持續觀察競爭態勢變化。`;
}

const KEY_PERSON_PROFILES: Record<string, KeyPersonRisk> = {
  "2330": {
    level: "low",
    ceo: "魏哲家 — 技術背景深厚，接班規劃明確，領導力穩健。",
    founder: "張忠謀已退居幕後，企業制度與文化已成熟定型。",
    succession: "接班人選經長期培養，治理制度完善。",
    teamMaturity: "研發與營運團隊分工清晰，管理層穩定。",
  },
  NVDA: {
    level: "low",
    ceo: "黃仁勳 — 創辦人兼 CEO，願景清晰、執行力極強。",
    founder: "創辦人仍在掌舵，戰略連貫性高。",
    succession: "尚未明確接班計畫，公司仍處高成長期。",
    teamMaturity: "研發人才密度業界頂尖，高層團隊穩定。",
  },
  AAPL: {
    level: "low",
    ceo: "Tim Cook — 營運能力卓越，供應鏈管理出色。",
    founder: "Steve Jobs 精神仍影響產品文化。",
    succession: "接班人選已在培養，公司治理成熟。",
    teamMaturity: "全球頂尖管理團隊，分工明確。",
  },
  MSFT: {
    level: "low",
    ceo: "Satya Nadella — 成功帶領雲端與 AI 轉型。",
    founder: "比爾蓋茲已淡出日常營運，制度成熟。",
    succession: "高層接班梯隊完整，治理穩健。",
    teamMaturity: "管理層經驗豐富，跨部門協作成熟。",
  },
  GOOGL: {
    level: "medium",
    ceo: "Sundar Pichai — 技術背景強，面臨 AI 轉型壓力。",
    founder: "創辦人已退居二線，影響力間接。",
    succession: "接班規劃不夠透明。",
    teamMaturity: "人才流失為近期隱憂。",
  },
  "2454": {
    level: "low",
    ceo: "蔡力行 — 半導體產業經驗豐富，策略執行力強。",
    founder: "創辦人精神仍影響研發文化。",
    succession: "研發與營運接班架構相對完整。",
    teamMaturity: "研發團隊實力堅強，管理層穩定。",
  },
  "2317": {
    level: "medium",
    ceo: "劉揚偉 — 推動轉型中，電動車策略仍在驗證期。",
    founder: "郭台銘影響力仍存，公司治理需持續觀察。",
    succession: "接班制度已建立，文化延續性有待觀察。",
    teamMaturity: "事業群龐大，跨部門協調為挑戰。",
  },
};

function buildAIConclusion(
  stock: StockInput,
  result: StockAnalysisResult
): AIConclusion {
  const undervaluedPercent = Math.max(
    0,
    Math.round(result.valuation.marginOfSafety)
  );
  const isUndervalued = result.valuation.marginOfSafety > 0;

  return {
    isUndervalued,
    suitableForDCA: result.buySignal.signal !== "AVOID",
    undervaluedPercent,
    highlights: [
      result.moat.moatScore >= 80 ? "護城河強" : "產業地位穩健",
      result.growthScore >= 70 ? "未來三年成長性佳" : "成長動能中等",
      isUndervalued ? "可考慮分批布局" : "建議等待更好價位",
    ],
    mainRisks: [
      stock.market === "TW" ? "地緣政治與匯率" : "總體經濟與利率",
      stock.debtToEquity > 1 ? "負債壓力偏高" : "產業競爭加劇",
    ],
    growthOutlook: `${stock.name} 預估年化成長率約 ${stock.growthRate}%，${stock.growthRate >= 15 ? "中長期成長動能仍強" : "成長趨於穩健"}。`,
    summary: result.aiSummary,
  };
}

function mapBuySignalToUI(signal: StockAnalysisResult["buySignal"]["signal"]): BuySignal {
  switch (signal) {
    case "STRONG_UNDERVALUED":
      return "strongly_undervalued";
    case "BUY":
      return "good_buy";
    case "WATCH":
      return "watch";
    case "OVERVALUED":
      return "overvalued";
    case "AVOID":
      return "avoid";
  }
}

export function analyzeStock(ticker: string): StockAnalysisResult | null {
  const stock = getMockStock(ticker);
  if (!stock) return null;

  const financials = toFinancials(stock);
  const valuation = calculateFairValue(financials, stock.currentPrice);
  const buySignal = getBuySignal(valuation.marginOfSafety);
  const moat = calculateMoatScore(stock);
  const financialScore = calculateFinancialScore(stock);
  const growthScore = calculateGrowthScore(stock);
  const managementScore = clampScore(stock.managementScore);
  const buffettScore = calculateBuffettScore(stock, moat.moatScore, financialScore);
  const valuationScore = clampScore(
    50 + valuation.marginOfSafety * 1.2
  );

  const totalScore = clampScore(
    moat.moatScore * 0.25 +
      financialScore * 0.25 +
      growthScore * 0.2 +
      managementScore * 0.15 +
      valuationScore * 0.15
  );

  const aiSummary = `${stock.name}（${stock.ticker}）目前股價 ${stock.currentPrice}，合理價約 ${Math.round(valuation.fairValue)}，安全邊際 ${valuation.marginOfSafety.toFixed(1)}%。綜合評分 ${totalScore} 分，${buySignal.label}。`;

  return {
    ticker: stock.ticker,
    name: stock.name,
    market: stock.market,
    currentPrice: stock.currentPrice,
    currency: stock.market === "TW" ? "TWD" : "USD",
    change: stock.change,
    changePercent: stock.changePercent,
    valuation,
    buySignal,
    moat,
    financialScore,
    growthScore,
    managementScore,
    buffettScore,
    totalScore,
    aiSummary,
  };
}

export function toStockAnalysis(result: StockAnalysisResult): StockAnalysis {
  const stock = getMockStock(result.ticker)!;
  const moatSummary = buildMoatSummary(result.moat.moatScore, result.name);
  const keyPersonRisk =
    KEY_PERSON_PROFILES[result.ticker] ?? {
      level: "medium" as const,
      ceo: "管理層資訊待更新。",
      founder: "創辦人資訊待更新。",
      succession: "接班規劃尚不明確。",
      teamMaturity: "團隊成熟度中等。",
    };

  const buffett: BuffettScore = {
    score: result.buffettScore,
    roe: stock.roe,
    freeCashFlow: clampScore(
      (stock.freeCashFlowPerShare / stock.currentPrice) * 100 * 8
    ),
    debtRatio: clampScore(stock.debtToEquity * 30),
    moat: result.moat.moatScore,
    profitStability: clampScore(result.financialScore * 0.9),
    summary: `ROE ${stock.roe.toFixed(1)}%、自由現金流穩健，綜合巴菲特式評分 ${result.buffettScore} 分。`,
  };

  const aiConclusion = buildAIConclusion(stock, result);

  return {
    symbol: result.ticker,
    name: result.name,
    market: result.market,
    price: result.currentPrice,
    change: result.change,
    changePercent: result.changePercent,
    currency: result.currency,
    totalScore: result.totalScore,
    buySignal: mapBuySignalToUI(result.buySignal.signal),
    aiScore: {
      moat: result.moat.moatScore,
      financials: result.financialScore,
      growth: result.growthScore,
      management: result.managementScore,
      valuation: clampScore(50 + result.valuation.marginOfSafety * 1.2),
    },
    valuation: {
      safetyPrice: result.valuation.safetyPrice,
      fairPrice: result.valuation.fairValue,
      optimisticPrice: result.valuation.bullCasePrice,
      dcfValue: result.valuation.dcfValue,
      marginOfSafety: result.valuation.marginOfSafety,
    },
    moat: {
      score: result.moat.moatScore,
      brand: result.moat.brandPower,
      technology: result.moat.technologyBarrier,
      networkEffect: result.moat.networkEffect,
      scaleEconomy: result.moat.scaleEconomy,
      switchingCost: result.moat.switchingCost,
      summary: moatSummary,
    },
    keyPersonRisk,
    buffett,
    aiConclusion,
  };
}

export function getStockAnalysisFromEngine(ticker: string): StockAnalysis | null {
  const result = analyzeStock(ticker);
  if (!result) return null;
  return toStockAnalysis(result);
}
