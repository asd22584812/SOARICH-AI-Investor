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

  const output = {
    soarichRating: result.totalScore,
    entryScore: result.entryScore,
    marginOfSafety: Number(mos.toFixed(1)),
    valuationScore: result.valuationScore,
    radarEligible: result.radarEligible,
    undervaluedFocusEligible: result.undervaluedFocusEligible,
    highQualityWatchEligible: result.highQualityWatchEligible,
    entryLabel: result.entryLabel,
    valuationConfidence: result.valuationConfidence,
    anomalies: [],
  };

  if (result.radarEligible && mos < 0) {
    output.anomalies.push("radar eligible with negative MOS");
  }
  if (result.undervaluedFocusEligible && mos <= 0) {
    output.anomalies.push("undervalued focus with non-positive MOS");
  }

  console.log(`\n=== ${query} ${stockInput.name} ===`);
  console.log(JSON.stringify(output, null, 2));
  return { ticker: query, ...output };
}

const results = [];
for (const ticker of TICKERS) {
  const row = await validateTicker(ticker);
  if (row) results.push(row);
}

console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(results, null, 2));
