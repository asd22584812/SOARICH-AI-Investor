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

const TW_TICKERS = new Set(["2330", "2454", "2317", "2308", "2327"]);

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

  const output = {
    entryLabel: result.entryLabel,
    internalSignal: result.entrySignal.signal,
    yahooSymbol: snapshot.yahooSymbol,
    currency: snapshot.currency,
    currentPrice: snapshot.currentPrice,
    name: snapshot.name,
    market: snapshot.market,
    dcfWasClamped: result.valuation.dcfWasClamped,
    radarEligible: result.radarEligible,
    undervaluedFocusEligible: result.undervaluedFocusEligible,
    highQualityWatchEligible: result.highQualityWatchEligible,
    anomalies: [],
  };

  if (TW_TICKERS.has(query)) {
    if (output.market !== "TW") {
      output.anomalies.push("TW ticker resolved to non-TW market");
    }
    if (output.currency !== "TWD") {
      output.anomalies.push("TW ticker resolved to non-TWD currency");
    }
    if (!/\.(TW|TWO)$/i.test(output.yahooSymbol)) {
      output.anomalies.push("TW ticker missing .TW/.TWO suffix");
    }
    if (!output.yahooSymbol.startsWith(`${query}.`)) {
      output.anomalies.push("yahooSymbol does not match input code");
    }
  }

  if (result.radarEligible && result.valuation.marginOfSafety < 0) {
    output.anomalies.push("radar eligible with negative MOS");
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
