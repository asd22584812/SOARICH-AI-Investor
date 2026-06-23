import { analyzeStockInput } from "../src/lib/stock/analyzer.ts";
import { mapEntryLabelToSignal } from "../src/lib/stock/entry.ts";
import { matchesMarketFilter } from "../src/lib/stock/market-filter.ts";
import { buildStockInputFromNormalized } from "../src/lib/stock/stock-input-builder.ts";
import { searchStock } from "../src/lib/stock/yahoo.ts";

const ALL_TICKERS = [
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

const TW_SCREEN = ["2330", "2454", "2317", "2308", "2327", "2881", "2882"];
const US_SCREEN = ["NVDA", "META", "AAPL", "MSFT", "GOOGL", "TSLA", "AMD"];

async function analyzeTicker(query) {
  const snapshot = await searchStock(query);
  if (!snapshot?.normalized) return null;
  const stockInput = buildStockInputFromNormalized(snapshot.normalized);
  if (!stockInput) return null;
  const result = analyzeStockInput(stockInput);
  return { snapshot, result };
}

function collectHomeTickers(analyses, filter) {
  return analyses
    .filter((row) => matchesMarketFilter(row.snapshot, filter))
    .map((row) => ({
      symbol: row.snapshot.displaySymbol,
      yahooSymbol: row.snapshot.yahooSymbol,
      market: row.snapshot.market,
      entryLabel: row.result.entryLabel,
      internalSignal: row.result.entrySignal.signal,
    }));
}

async function validateMarketFilter(filter) {
  const screen = filter === "TW" ? TW_SCREEN : US_SCREEN;
  const rows = (
    await Promise.all(screen.map((ticker) => analyzeTicker(ticker)))
  ).filter(Boolean);

  const homeItems = collectHomeTickers(rows, filter);
  const violations = [];

  for (const item of homeItems) {
    const isTw = item.market === "TW" || /\.(TW|TWO)$/i.test(item.yahooSymbol);
    if (filter === "TW" && !isTw) {
      violations.push(`${item.symbol}: not TW`);
    }
    if (filter === "US" && (item.market !== "US" || /\.(TW|TWO)$/i.test(item.yahooSymbol))) {
      violations.push(`${item.symbol}: not US`);
    }
    if (item.internalSignal.includes("BUY")) {
      violations.push(`${item.symbol}: contains BUY signal`);
    }
    if (/買入/.test(item.entryLabel)) {
      violations.push(`${item.symbol}: entryLabel contains 買入`);
    }
  }

  return { filter, homeItems, violations };
}

console.log("=== Signal vocabulary check ===");
const forbidden = ["STRONG_BUY", "BUY", "買入", "強烈買入", "適合買入"];
for (const label of [
  "深度低估，值得深入研究",
  "具安全邊際",
  "接近合理價",
  "好公司，但價格偏高",
  "暫不具吸引力",
]) {
  const mapped = mapEntryLabelToSignal(label);
  console.log(label, "->", mapped.signal);
  for (const word of forbidden) {
    if (mapped.signal.includes(word) || label.includes(word)) {
      console.log("VIOLATION:", word);
    }
  }
}

console.log("\n=== TW market filter ===");
const tw = await validateMarketFilter("TW");
console.log(JSON.stringify(tw, null, 2));

console.log("\n=== US market filter ===");
const us = await validateMarketFilter("US");
console.log(JSON.stringify(us, null, 2));

console.log("\n=== Full ticker validation ===");
for (const ticker of ALL_TICKERS) {
  const row = await analyzeTicker(ticker);
  if (!row) {
    console.log(ticker, "FAILED");
    continue;
  }
  console.log(
    JSON.stringify({
      ticker,
      entryLabel: row.result.entryLabel,
      internalSignal: row.result.entrySignal.signal,
      yahooSymbol: row.snapshot.yahooSymbol,
      currency: row.snapshot.currency,
      currentPrice: row.snapshot.currentPrice,
      dcfWasClamped: row.result.valuation.dcfWasClamped,
      radarEligible: row.result.radarEligible,
      undervaluedFocusEligible: row.result.undervaluedFocusEligible,
      highQualityWatchEligible: row.result.highQualityWatchEligible,
    })
  );
}
