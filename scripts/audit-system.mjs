import { applyCompanyClassification } from "../src/lib/stock/company-classification.ts";
import { analyzeStockInput } from "../src/lib/stock/analyzer.ts";
import { buildStockInputFromNormalized } from "../src/lib/stock/stock-input-builder.ts";
import { calculateMoatScore } from "../src/lib/stock/moat.ts";
import {
  normalizeDebtToEquity,
  normalizeFinancials,
  normalizePercentField,
  normalizeYahooQuote,
  normalizeYahooSummary,
} from "../src/lib/stock/normalizer.ts";
import {
  calculateDCFValue,
  calculateFCFMultipleValue,
  calculateFairValue,
  calculatePBValue,
  calculatePEValue,
  calculatePEGValue,
  calculateValuationScore,
  getValuationWeights,
} from "../src/lib/stock/valuation.ts";
import {
  fetchYahooQuote,
  fetchYahooSummary,
  searchStock,
} from "../src/lib/stock/yahoo.ts";

const TICKERS = [
  "NVDA",
  "AAPL",
  "MSFT",
  "GOOGL",
  "META",
  "TSLA",
  "2330",
  "2454",
  "2317",
  "2308",
  "2327",
];

function round(n, d = 2) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n * 10 ** d) / 10 ** d;
}

function explainDebt(raw) {
  if (raw == null) return "null → null";
  if (raw > 20) return `raw ${raw} > 20 → 視為百分比，÷100 = ${round(raw / 100, 4)}`;
  if (raw > 1) return `raw ${raw} > 1 → 視為百分比，÷100 = ${round(raw / 100, 4)}`;
  return `raw ${raw} ≤ 1 → 視為已是倍數，直接使用 = ${round(raw, 4)}`;
}

function explainPercent(field, raw) {
  if (raw == null) return `${field}: null`;
  const norm = normalizePercentField(raw);
  const rule = Math.abs(raw) <= 5 ? "ratio×100" : "已是%";
  return `${field}: raw ${round(raw, 4)} → ${round(norm, 2)}% (${rule})`;
}

function explainClassification(data) {
  const reasons = [];
  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`.toLowerCase();
  const growth = data.revenueGrowth ?? 0;
  const roe = data.roe ?? 0;
  const roa = data.roa ?? 0;
  const opMargin = data.operatingMargin ?? 0;
  const grossMargin = data.grossMargin ?? 0;
  const pe = data.pe.value ?? 0;
  const pb = data.pb.value ?? 0;
  const marketCap = data.marketCap ?? 0;
  const debt = data.debtToEquity;
  const result = data.companyClassification;

  if (data.insufficientData) {
    return { result, reasons: ["insufficientData=true"] };
  }

  if (/financial|bank|insurance|capital market|credit|mortgage|reit|broker|asset management/i.test(industryText)) {
    reasons.push(`產業符合金融股 pattern: "${data.industry ?? data.sector}"`);
    return { result, reasons };
  }
  if (/steel|mining|oil|gas|energy|chemical|material|auto|construction|shipping|airline|cement|paper|commodity/i.test(industryText)) {
    reasons.push(`產業符合週期股 pattern: "${data.industry ?? data.sector}"`);
    return { result, reasons };
  }

  const checks = [];
  if (growth >= 15 && (pe >= 22 || /semiconductor|software|technology|internet|platform|cloud|electronic|chip/i.test(industryText) || opMargin >= 18)) {
    checks.push(`Growth規則: revenueGrowth=${round(growth)}%≥15 且 (PE=${round(pe)}≥22 或科技產業 或 opMargin=${round(opMargin)}%≥18)`);
  }
  if (roe >= 15 && opMargin >= 12 && growth >= 8 && growth <= 28 && (marketCap >= 50e9 || grossMargin >= 35)) {
    checks.push(`Quality規則: ROE=${round(roe)}%≥15, opMargin=${round(opMargin)}%≥12, growth=${round(growth)}%∈[8,28], largeCap/grossMargin`);
  }
  if (pb > 0 && pb <= 2.5 && pe > 0 && pe <= 18 && growth <= 12 && (debt == null || debt <= 2)) {
    checks.push(`金融proxy: PB=${round(pb)}≤2.5, PE=${round(pe)}≤18, growth=${round(growth)}%≤12`);
  }
  if (growth < 8 && pe > 0 && pe <= 16 && pb > 0 && pb <= 3) {
    checks.push(`Value規則: growth<8%, PE≤16, PB≤3`);
  }
  if (marketCap >= 200e9 && roe >= 12 && opMargin >= 10 && growth >= 6) {
    checks.push(`MegaCap Quality: cap≥200B, ROE≥12%, opMargin≥10%, growth≥6%`);
  }
  if (growth >= 12 || (/semiconductor|software|technology|internet|platform|cloud|electronic|chip/i.test(industryText) && growth >= 8)) {
    checks.push(`Growth fallback: growth≥12% 或科技且growth≥8%`);
  }
  if (roe >= 12 && roa >= 6 && opMargin >= 10) {
    checks.push(`Quality fallback: ROE≥12%, ROA≥6%, opMargin≥10%`);
  }
  if (pe > 0 && pe <= 18 && growth <= 10) {
    checks.push(`Value fallback: PE≤18, growth≤10%`);
  }

  reasons.push(...(checks.length ? checks : [`預設: growth=${round(growth)}% → ${growth >= 10 ? "growth" : "value"}`]));
  return { result, reasons };
}

function financialBreakdown(stock) {
  const roeScore = (Math.min(stock.roe, 30) / 30) * 100;
  const roaScore = (Math.min(stock.roa, 15) / 15) * 100;
  const grossMarginScore = (Math.min(stock.grossMargin, 60) / 60) * 100;
  const marginScore = (Math.min(stock.operatingMargin, 40) / 40) * 100;
  const debtScore = stock.debtToEquity == null ? 55 : Math.max(0, Math.min(100, Math.round(100 - stock.debtToEquity * 35)));
  const fcfMarginScore = stock.fcfMargin != null ? Math.max(0, Math.min(100, Math.round((Math.min(stock.fcfMargin, 35) / 35) * 100))) : 55;
  const currentRatioScore = stock.currentRatio != null ? Math.max(0, Math.min(100, Math.round(Math.min(stock.currentRatio, 3) / 3 * 100))) : 55;
  const total = Math.round(
    roeScore * 0.28 + roaScore * 0.12 + grossMarginScore * 0.15 + marginScore * 0.2 +
    debtScore * 0.15 + fcfMarginScore * 0.05 + currentRatioScore * 0.05
  );
  return {
    roe: { raw: stock.roe, score: round(roeScore), weight: 0.28, contrib: round(roeScore * 0.28) },
    roa: { raw: stock.roa, score: round(roaScore), weight: 0.12, contrib: round(roaScore * 0.12) },
    grossMargin: { raw: stock.grossMargin, score: round(grossMarginScore), weight: 0.15, contrib: round(grossMarginScore * 0.15) },
    operatingMargin: { raw: stock.operatingMargin, score: round(marginScore), weight: 0.2, contrib: round(marginScore * 0.2) },
    debt: { raw: stock.debtToEquity, score: debtScore, weight: 0.15, contrib: round(debtScore * 0.15) },
    fcfMargin: { raw: stock.fcfMargin, score: fcfMarginScore, weight: 0.05, contrib: round(fcfMarginScore * 0.05) },
    currentRatio: { raw: stock.currentRatio, score: currentRatioScore, weight: 0.05, contrib: round(currentRatioScore * 0.05) },
    total: Math.max(0, Math.min(100, total)),
  };
}

function buffettBreakdown(stock, moatScore, financialScore) {
  const fcfYield = stock.currentPrice > 0 && stock.freeCashFlowPerShare > 0
    ? (stock.freeCashFlowPerShare / stock.currentPrice) * 100 : 0;
  const fcfYieldScore = Math.max(0, Math.min(100, Math.round(Math.min(fcfYield, 12) / 12 * 100)));
  const roeScore = (Math.min(stock.roe, 30) / 30) * 100;
  const debtScore = stock.debtToEquity == null ? 55 : Math.max(0, Math.min(100, Math.round(100 - stock.debtToEquity * 35)));
  const profitStability = Math.max(0, Math.min(100, Math.round(financialScore * 0.45 + Math.min(stock.operatingMargin, 40) * 1.1)));
  const total = Math.round(
    financialScore * 0.35 + moatScore * 0.25 + fcfYieldScore * 0.15 +
    roeScore * 0.1 + debtScore * 0.08 + profitStability * 0.07
  );
  return {
    financialScore: { weight: 0.35, contrib: round(financialScore * 0.35) },
    moat: { raw: moatScore, weight: 0.25, contrib: round(moatScore * 0.25) },
    fcfYield: { raw: round(fcfYield), score: fcfYieldScore, weight: 0.15, contrib: round(fcfYieldScore * 0.15) },
    roe: { raw: stock.roe, score: round(roeScore), weight: 0.1, contrib: round(roeScore * 0.1) },
    debt: { raw: stock.debtToEquity, score: debtScore, weight: 0.08, contrib: round(debtScore * 0.08) },
    profitStability: { score: profitStability, weight: 0.07, contrib: round(profitStability * 0.07) },
    total: Math.max(0, Math.min(100, total)),
  };
}

function ratingBreakdown(result) {
  const w = { moat: 0.25, financial: 0.25, growth: 0.2, management: 0.1, valuation: 0.2 };
  return {
    weights: w,
    moat: { score: result.moat.moatScore, contrib: round(result.moat.moatScore * w.moat) },
    financial: { score: result.financialScore, contrib: round(result.financialScore * w.financial) },
    growth: { score: result.growthScore, contrib: round(result.growthScore * w.growth) },
    management: { score: result.managementScore, contrib: round(result.managementScore * w.management) },
    valuation: { score: result.valuationScore, contrib: round(result.valuationScore * w.valuation) },
    total: result.totalScore,
  };
}

const anomalies = [];

async function auditTicker(query) {
  const snapshot = await searchStock(query);
  if (!snapshot?.normalized) {
    anomalies.push(`${query}: 無法取得 snapshot`);
    return null;
  }

  const yahooSymbol = snapshot.yahooSymbol;
  const quote = await fetchYahooQuote(yahooSymbol).catch(() => null);
  const summary = await fetchYahooSummary(yahooSymbol).catch(() => null);

  const rawSummary = summary?.financialData ?? {};
  const rawDebt = rawSummary.debtToEquity ?? null;
  const rawRoe = rawSummary.returnOnEquity ?? null;

  const stock = buildStockInputFromNormalized(snapshot.normalized);
  const result = analyzeStockInput(stock);
  const fin = {
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

  const valuation = calculateFairValue(fin, stock.currentPrice, stock.companyClassification);
  const mosCalc = valuation.fairValue > 0
    ? ((valuation.fairValue - stock.currentPrice) / valuation.fairValue) * 100
    : 0;

  if ((valuation.fairValue > stock.currentPrice && valuation.marginOfSafety <= 0) ||
      (valuation.fairValue < stock.currentPrice && valuation.marginOfSafety >= 0)) {
    anomalies.push(`${query}: MOS 方向與 Fair Value/Price 不一致`);
  }

  if (rawRoe != null && Math.abs(rawRoe) <= 5 && stock.roe < 10) {
    anomalies.push(`${query}: ROE 可能未正確 ratio→% (raw=${rawRoe}, norm=${stock.roe})`);
  }

  if (rawDebt != null && rawDebt > 1 && rawDebt <= 20 && stock.debtToEquity < rawDebt / 10) {
    anomalies.push(`${query}: D/E 可能過度除以100 (raw=${rawDebt}, norm=${stock.debtToEquity}) — 需人工確認是否真為 6.55 倍`);
  }

  const classExplain = explainClassification(snapshot.normalized);
  const finBreak = financialBreakdown(stock);
  const buffBreak = buffettBreakdown(stock, result.moat.moatScore, result.financialScore);
  const ratingBreak = ratingBreakdown(result);

  return {
    symbol: stock.ticker,
    name: stock.name,
    raw: {
      currentPrice: quote?.regularMarketPrice ?? summary?.price?.regularMarketPrice,
      eps: quote?.epsTrailingTwelveMonths ?? summary?.defaultKeyStatistics?.trailingEps,
      pe: quote?.trailingPE ?? summary?.summaryDetail?.trailingPE,
      pb: quote?.priceToBook ?? summary?.defaultKeyStatistics?.priceToBook,
      peg: summary?.defaultKeyStatistics?.pegRatio,
      marketCap: quote?.marketCap ?? summary?.summaryDetail?.marketCap,
      revenueGrowth: rawSummary.revenueGrowth,
      roe: rawRoe,
      roa: rawSummary.returnOnAssets,
      grossMargin: rawSummary.grossMargins,
      operatingMargin: rawSummary.operatingMargins,
      debtToEquity: rawDebt,
      fcfPerShare: summary?.financialData?.freeCashflow && summary?.defaultKeyStatistics?.sharesOutstanding
        ? summary.financialData.freeCashflow / summary.defaultKeyStatistics.sharesOutstanding : null,
    },
    normalized: {
      currentPrice: snapshot.normalized.currentPrice,
      eps: snapshot.normalized.eps,
      pe: snapshot.normalized.pe,
      pb: snapshot.normalized.pb,
      peg: snapshot.normalized.peg,
      marketCap: snapshot.normalized.marketCap,
      revenueGrowth: snapshot.normalized.revenueGrowth,
      roe: snapshot.normalized.roe,
      roa: snapshot.normalized.roa,
      grossMargin: snapshot.normalized.grossMargin,
      operatingMargin: snapshot.normalized.operatingMargin,
      debtToEquity: snapshot.normalized.debtToEquity,
      fcfPerShare: snapshot.normalized.freeCashFlowPerShare,
      fcfSource: snapshot.normalized.fcfPerShareSource,
    },
    percentChecks: {
      roe: explainPercent("ROE", rawRoe),
      roa: explainPercent("ROA", rawSummary.returnOnAssets),
      grossMargin: explainPercent("GrossMargin", rawSummary.grossMargins),
      operatingMargin: explainPercent("OpMargin", rawSummary.operatingMargins),
      revenueGrowth: explainPercent("RevGrowth", rawSummary.revenueGrowth),
    },
    debtCheck: {
      raw: rawDebt,
      normalized: snapshot.normalized.debtToEquity,
      logic: explainDebt(rawDebt),
    },
    classification: classExplain,
    valuation: {
      dcf: round(valuation.dcfValue),
      pe: round(valuation.peValue),
      peg: round(valuation.pegValue),
      pb: round(valuation.pbValue),
      fcfMultiple: round(valuation.fcfMultipleValue),
      weights: valuation.weights,
      weightedSum: round(
        valuation.dcfValue * valuation.weights.dcf +
        valuation.peValue * valuation.weights.pe +
        valuation.pegValue * valuation.weights.peg +
        valuation.pbValue * valuation.weights.pb +
        valuation.fcfMultipleValue * valuation.weights.fcfMultiple
      ),
      fairValue: round(valuation.fairValue),
    },
    mos: {
      currentPrice: stock.currentPrice,
      fairValue: round(valuation.fairValue),
      marginOfSafety: round(valuation.marginOfSafety),
      formula: "MOS = (FairValue - CurrentPrice) / FairValue × 100",
      calculation: `((${round(valuation.fairValue)} - ${stock.currentPrice}) / ${round(valuation.fairValue)}) × 100 = ${round(mosCalc)}%`,
      directionOk: (valuation.fairValue > stock.currentPrice) === (valuation.marginOfSafety > 0),
    },
    valuationScore: {
      mos: round(valuation.marginOfSafety),
      score: result.valuationScore,
      table: [
        "MOS≥40% → 95", "MOS≥25% → 85", "MOS≥10% → 75", "MOS≥0% → 65",
        "MOS≥-15% → 50", "MOS≥-30% → 35", "else → 20",
      ],
    },
    financialBreakdown: finBreak,
    buffettBreakdown: buffBreak,
    ratingBreakdown: ratingBreak,
    result: {
      moatScore: result.moat.moatScore,
      financialScore: result.financialScore,
      buffettScore: result.buffettScore,
      totalScore: result.totalScore,
      insufficientData: result.insufficientData,
      radarEligible: result.radarEligible,
    },
  };
}

const results = [];
for (const t of TICKERS) {
  console.error(`Auditing ${t}...`);
  const r = await auditTicker(t);
  if (r) results.push(r);
}

console.log(JSON.stringify({ results, anomalies, valuationScoreTable: calculateValuationScore }, null, 2));
