import { analyzeStockInput } from "../src/lib/stock/analyzer.ts";
import { buildStockInputFromNormalized } from "../src/lib/stock/stock-input-builder.ts";
import { searchStock } from "../src/lib/stock/yahoo.ts";

const TICKERS = [
  "NVDA",
  "META",
  "AAPL",
  "MSFT",
  "GOOGL",
  "TSLA",
  "2330",
  "2454",
  "2317",
  "2308",
  "2327",
];

async function validateTicker(query) {
  const snapshot = await searchStock(query);
  if (!snapshot?.normalized) {
    console.log(`\n=== ${query} ===`);
    console.log("FAILED: no snapshot");
    return null;
  }

  const normalized = snapshot.normalized;
  const stockInput = buildStockInputFromNormalized(normalized);
  if (!stockInput) {
    console.log(`\n=== ${query} ===`);
    console.log("FAILED: no stock input");
    return null;
  }

  const result = analyzeStockInput(stockInput);
  const mos = result.valuation.marginOfSafety;
  const mosDirection =
    mos > 0
      ? "undervalued"
      : mos < 0
        ? "overvalued"
        : "fair";

  const output = {
    rawDebtToEquity: normalized.rawDebtToEquity,
    normalizedDebtToEquity: normalized.debtToEquity,
    debtToEquityUncertain: normalized.debtToEquityUncertain,
    companyClassification: result.companyClassification,
    classificationScores: normalized.classificationScores,
    classificationReasons: normalized.classificationReasons,
    peUnreliable: stockInput.peUnreliable,
    peHighRisk: stockInput.peHighRisk,
    fairValue: Math.round(result.valuation.fairValue),
    marginOfSafety: Number(mos.toFixed(1)),
    mosDirection,
    valuationScore: result.valuationScore,
    financialScore: result.financialScore,
    buffettScore: result.buffettScore,
    soarichRating: result.totalScore,
    radarEligible: result.radarEligible,
    anomalies: [],
  };

  const scores = [
    result.totalScore,
    result.financialScore,
    result.buffettScore,
    result.valuationScore,
    result.growthScore,
    result.moat.moatScore,
  ];
  if (!scores.every((s) => Number.isInteger(s))) {
    output.anomalies.push("non-integer score");
  }
  if (Math.abs(mos) > 500) {
    output.anomalies.push("extreme MOS magnitude");
  }

  console.log(`\n=== ${query} ${stockInput.name} ===`);
  console.log(JSON.stringify(output, null, 2));
  return output;
}

const results = [];
for (const ticker of TICKERS) {
  const row = await validateTicker(ticker);
  if (row) results.push({ ticker, ...row });
}

console.log("\n=== SUMMARY ===");
console.log(
  JSON.stringify(
    results.map((r) => ({
      ticker: r.ticker,
      class: r.companyClassification,
      scores: r.classificationScores,
      fairValue: r.fairValue,
      mos: r.marginOfSafety,
      rating: r.soarichRating,
      radar: r.radarEligible,
      anomalies: r.anomalies,
    })),
    null,
    2
  )
);
