import type {
  AIConclusion,
  BuffettScore,
  BuySignal,
  KeyPersonRisk,
  StockAnalysis,
} from "@/types/stock";
import { formatMarginOfSafetyDisplay } from "@/lib/utils";
import { calculateMoatScore } from "./moat";
import { getMockStock } from "./mockData";
import {
  getBuySignalFromScore,
  mapAnalysisSignalToUI,
} from "./signal";
import type {
  StockAnalysisResult,
  StockFinancials,
  StockInput,
} from "./types";
import {
  calculateFairValue,
  calculateValuationScore,
} from "./valuation";

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
    currentRatio: stock.currentRatio,
    profitMargin: stock.profitMargin,
    fcfMargin: stock.fcfMargin,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateFinancialScore(stock: StockInput): number {
  const roeScore = (Math.min(stock.roe, 30) / 30) * 100;
  const roaScore = (Math.min(stock.roa, 15) / 15) * 100;
  const grossMarginScore = (Math.min(stock.grossMargin, 60) / 60) * 100;
  const marginScore = (Math.min(stock.operatingMargin, 40) / 40) * 100;

  const debtScore =
    stock.debtToEquity == null
      ? 55
      : clampScore(100 - stock.debtToEquity * 35);

  const fcfMarginScore =
    stock.fcfMargin != null
      ? clampScore((Math.min(stock.fcfMargin, 35) / 35) * 100)
      : 55;

  const currentRatioScore =
    stock.currentRatio != null
      ? clampScore(Math.min(stock.currentRatio, 3) / 3 * 100)
      : 55;

  const weights = stock.debtToEquityUncertain
    ? {
        roe: 0.28 + 0.075 * (0.28 / 0.85),
        roa: 0.12 + 0.075 * (0.12 / 0.85),
        gross: 0.15 + 0.075 * (0.15 / 0.85),
        margin: 0.2 + 0.075 * (0.2 / 0.85),
        debt: 0.075,
        fcf: 0.05 + 0.075 * (0.05 / 0.85),
        current: 0.05 + 0.075 * (0.05 / 0.85),
      }
    : {
        roe: 0.28,
        roa: 0.12,
        gross: 0.15,
        margin: 0.2,
        debt: 0.15,
        fcf: 0.05,
        current: 0.05,
      };

  return clampScore(
    roeScore * weights.roe +
      roaScore * weights.roa +
      grossMarginScore * weights.gross +
      marginScore * weights.margin +
      debtScore * weights.debt +
      fcfMarginScore * weights.fcf +
      currentRatioScore * weights.current
  );
}

function calculateGrowthScore(stock: StockInput): number {
  const growth = Math.max(stock.growthRate, 0);
  const earningsGrowthBoost =
    stock.companyClassification === "growth" ? 8 : 0;
  return clampScore(growth * 2.2 + stock.grossMargin * 0.25 + earningsGrowthBoost);
}

function calculateBuffettScore(
  stock: StockInput,
  moatScore: number,
  financialScore: number
): number {
  const fcfYield =
    stock.currentPrice > 0 && stock.freeCashFlowPerShare > 0
      ? (stock.freeCashFlowPerShare / stock.currentPrice) * 100
      : 0;
  const fcfYieldScore = clampScore(Math.min(fcfYield, 12) / 12 * 100);
  const roeScore = (Math.min(stock.roe, 30) / 30) * 100;
  const debtScore =
    stock.debtToEquity == null
      ? 55
      : clampScore(100 - stock.debtToEquity * 35);
  const profitStability = clampScore(
    financialScore * 0.45 + Math.min(stock.operatingMargin, 40) * 1.1
  );

  return clampScore(
    financialScore * 0.35 +
      moatScore * 0.25 +
      fcfYieldScore * 0.15 +
      roeScore * 0.1 +
      debtScore * 0.08 +
      profitStability * 0.07
  );
}

function buildMoatSummary(
  moatScore: number,
  name: string,
  isEstimate: boolean
): string {
  const prefix = isEstimate ? "護城河為模型估算：" : "";
  if (moatScore >= 90) {
    return `${prefix}${name}具備極強護城河，技術與規模優勢難以複製。`;
  }
  if (moatScore >= 75) {
    return `${prefix}${name}擁有穩固競爭優勢，長期市場地位相對穩健。`;
  }
  if (moatScore >= 60) {
    return `${prefix}${name}具備一定護城河，但產業競爭仍帶來壓力。`;
  }
  return `${prefix}${name}護城河有限，需持續觀察競爭態勢變化。`;
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
    ceo: "Satya Nadella — 成功帶領雲端與企業服務轉型。",
    founder: "比爾蓋茲已淡出日常營運，制度成熟。",
    succession: "高層接班梯隊完整，治理穩健。",
    teamMaturity: "管理層經驗豐富，跨部門協作成熟。",
  },
  GOOGL: {
    level: "medium",
    ceo: "Sundar Pichai — 技術背景強，面臨產業轉型壓力。",
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
    suitableForDCA: result.totalScore >= 80 && !result.insufficientData,
    undervaluedPercent,
    highlights: result.insufficientData
      ? ["關鍵財務資料不足", "建議參考最新財報", "暫不納入精選雷達"]
      : [
          result.moat.moatScore >= 80 ? "護城河強" : "產業地位穩健",
          result.growthScore >= 70 ? "成長動能佳" : "成長動能中等",
          isUndervalued ? "估值具吸引力" : "建議等待更好價位",
        ],
    mainRisks: [
      stock.market === "TW" ? "地緣政治與匯率" : "總體經濟與利率",
      stock.debtToEquity != null && stock.debtToEquity > 1.2
        ? "負債壓力偏高"
        : "產業競爭加劇",
    ],
    growthOutlook: result.insufficientData
      ? `${stock.name} 關鍵財務資料不足，暫無法提供完整成長展望。`
      : `${stock.name} 預估年化成長率約 ${stock.growthRate.toFixed(1)}%，${stock.growthRate >= 15 ? "中長期成長動能仍強" : "成長趨於穩健"}。`,
    summary: result.aiSummary,
  };
}

function mapBuySignalToUI(signal: StockAnalysisResult["buySignal"]["signal"]): BuySignal {
  return mapAnalysisSignalToUI(signal);
}

export function analyzeStockInput(stock: StockInput): StockAnalysisResult {
  if (stock.insufficientData) {
    const moat = calculateMoatScore(stock);
    return {
      ticker: stock.ticker,
      name: stock.name,
      market: stock.market,
      currentPrice: stock.currentPrice,
      currency: stock.market === "TW" ? "TWD" : "USD",
      change: stock.change,
      changePercent: stock.changePercent,
      valuation: {
        dcfValue: 0,
        peValue: 0,
        pegValue: 0,
        pbValue: 0,
        fcfMultipleValue: 0,
        fairValue: stock.currentPrice,
        safetyPrice: stock.currentPrice,
        bullCasePrice: stock.currentPrice,
        marginOfSafety: 0,
        companyClassification: "insufficient_data",
        weights: {
          dcf: 0,
          pe: 0,
          peg: 0,
          pb: 0,
          fcfMultiple: 0,
          roeQuality: 0,
          dividendBook: 0,
        },
      },
      buySignal: getBuySignalFromScore(0),
      moat,
      financialScore: 0,
      growthScore: 0,
      managementScore: 0,
      buffettScore: 0,
      valuationScore: 0,
      totalScore: 0,
      aiSummary: `${stock.name}（${stock.ticker}）資料不足，暫不評級。`,
      insufficientData: true,
      moatIsEstimate: stock.moatIsEstimate,
      companyClassification: "insufficient_data",
      radarEligible: false,
    };
  }

  const financials = toFinancials(stock);
  const valuation = calculateFairValue(
    financials,
    stock.currentPrice,
    stock.companyClassification,
    {
      peUnreliable: stock.peUnreliable,
      peHighRisk: stock.peHighRisk,
    }
  );
  const moat = calculateMoatScore(stock);
  const financialScore = calculateFinancialScore(stock);
  const growthScore = calculateGrowthScore(stock);
  const managementScore = clampScore(stock.managementScore);
  const buffettScore = calculateBuffettScore(stock, moat.moatScore, financialScore);
  const valuationScore = calculateValuationScore(valuation.marginOfSafety);

  const totalScore = clampScore(
    moat.moatScore * 0.25 +
      financialScore * 0.25 +
      growthScore * 0.2 +
      managementScore * 0.1 +
      valuationScore * 0.2
  );

  const buySignal = getBuySignalFromScore(totalScore);

  const aiSummary = `${stock.name}（${stock.ticker}）SOARICH Rating ${totalScore} 分，建議「${buySignal.label}」。目前股價 ${stock.currentPrice}，合理價約 ${Math.round(valuation.fairValue)}，安全邊際 ${formatMarginOfSafetyDisplay(valuation.marginOfSafety)}。`;

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
    valuationScore,
    totalScore,
    aiSummary,
    insufficientData: false,
    moatIsEstimate: stock.moatIsEstimate,
    companyClassification: stock.companyClassification,
    radarEligible: totalScore >= 80,
  };
}

export function analyzeStock(ticker: string): StockAnalysisResult | null {
  const stock = getMockStock(ticker);
  if (!stock) return null;
  return analyzeStockInput(stock);
}

export interface NullableFinancialMetrics {
  roe: number | null;
  roa: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  debtToEquity: number | null;
  eps: number | null;
  growthRate: number | null;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  industry: string | null;
  insufficientData?: boolean;
  radarEligible?: boolean;
}

export function toStockAnalysis(
  result: StockAnalysisResult,
  stock: StockInput,
  metrics?: NullableFinancialMetrics
): StockAnalysis {
  const moatSummary = buildMoatSummary(
    result.moat.moatScore,
    result.name,
    result.moatIsEstimate
  );
  const keyPersonRisk =
    KEY_PERSON_PROFILES[result.ticker] ?? {
      level: "medium" as const,
      ceo: "管理層資訊待更新。",
      founder: "創辦人資訊待更新。",
      succession: "接班規劃尚不明確。",
      teamMaturity: "團隊成熟度中等。",
    };

  const roe = metrics?.roe ?? stock.roe;
  const roa = metrics?.roa ?? stock.roa;
  const growthRate = metrics?.growthRate ?? stock.growthRate;

  const buffett: BuffettScore = {
    score: result.buffettScore,
    roe: roe ?? 0,
    freeCashFlow: clampScore(
      stock.currentPrice > 0 && stock.freeCashFlowPerShare > 0
        ? (stock.freeCashFlowPerShare / stock.currentPrice) * 100 * 8
        : 0
    ),
    debtRatio:
      stock.debtToEquity != null ? clampScore(stock.debtToEquity * 30) : 0,
    moat: result.moat.moatScore,
    profitStability: clampScore(result.financialScore * 0.9),
    summary: result.insufficientData
      ? "資料不足，暫無法提供完整巴菲特式評分。"
      : roe != null
        ? `ROE ${roe.toFixed(1)}%、綜合巴菲特式評分 ${result.buffettScore} 分。`
        : `綜合巴菲特式評分 ${result.buffettScore} 分。`,
  };

  const aiConclusion = buildAIConclusion(stock, result);

  return {
    symbol: result.ticker,
    name: result.name,
    market: result.market,
    industry: metrics?.industry ?? null,
    price: result.currentPrice,
    change: result.change,
    changePercent: result.changePercent,
    currency: result.currency,
    totalScore: result.totalScore,
    buySignal: result.insufficientData
      ? "avoid"
      : mapBuySignalToUI(result.buySignal.signal),
    aiScore: {
      moat: result.moat.moatScore,
      financials: result.financialScore,
      growth: result.growthScore,
      management: result.managementScore,
      valuation: result.valuationScore,
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
    aiConclusion: {
      ...aiConclusion,
      growthOutlook: result.insufficientData
        ? `${stock.name} 資料不足，暫不評級。`
        : growthRate > 0
          ? aiConclusion.growthOutlook
          : `${stock.name} 成長率資料暫缺（N/A），建議搭配最新財報確認。`,
      summary: result.aiSummary,
    },
    financialProfile: {
      score: result.financialScore,
      roe: metrics?.roe ?? (stock.roe > 0 ? stock.roe : null),
      roa: metrics?.roa ?? (stock.roa > 0 ? stock.roa : null),
      grossMargin:
        metrics?.grossMargin ?? (stock.grossMargin > 0 ? stock.grossMargin : null),
      operatingMargin:
        metrics?.operatingMargin ??
        (stock.operatingMargin > 0 ? stock.operatingMargin : null),
      debtToEquity: metrics?.debtToEquity ?? stock.debtToEquity,
      eps: metrics?.eps ?? (stock.eps > 0 ? stock.eps : null),
      growthRate: metrics?.growthRate ?? (stock.growthRate > 0 ? stock.growthRate : null),
      pe: metrics?.pe ?? (stock.pe > 0 ? stock.pe : null),
      pb: metrics?.pb ?? (stock.pb > 0 ? stock.pb : null),
      marketCap: metrics?.marketCap ?? stock.marketCap,
    },
  };
}

export function getStockAnalysisFromEngine(ticker: string): StockAnalysis | null {
  const result = analyzeStock(ticker);
  if (!result) return null;
  const stock = getMockStock(ticker);
  if (!stock) return null;
  return toStockAnalysis(result, stock);
}
