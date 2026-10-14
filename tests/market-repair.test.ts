import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeFinancials, normalizeDebtToEquity, normalizePercentField, normalizeYahooSummary } from "../src/lib/stock/normalizer";
import { calculateDCFValue, calculatePEGValue } from "../src/lib/stock/valuation";
import { buildStockInputFromNormalized, snapshotToNullableMetrics } from "../src/lib/stock/stock-input-builder";
import { analyzeStockInput, toStockAnalysis } from "../src/lib/stock/analyzer";
import { buildHomeMarketFeed } from "../src/lib/stock/home-feed";
import { parseNasdaqDirectory, getUsUniverse } from "../src/lib/scanner/universe";
import type { YahooStockSnapshot } from "../src/lib/stock/yahoo";

// Isolated synthetic fixtures are only used for tests; never served by the app.
function financials() {
  return normalizeFinancials({
    displaySymbol: "TEST", yahooSymbol: "TEST", market: "US", currency: "USD",
    quote: { quoteType: "EQUITY", currency: "USD", regularMarketPrice: 50, epsTrailingTwelveMonths: 5, trailingPE: 10, priceToBook: 2 },
    summary: {
      defaultKeyStatistics: { trailingEps: 5, bookValue: 25, sharesOutstanding: 100 },
      financialData: { financialCurrency: "USD", freeCashflow: 500, totalRevenue: 2000, returnOnEquity: 0.3, returnOnAssets: 0.2, grossMargins: 0.6, operatingMargins: 0.4, profitMargins: 0.25, revenueGrowth: 0.2, debtToEquity: 3, currentRatio: 2 },
      assetProfile: { sector: "Technology", industry: "Software" },
    },
  });
}
function snapshot(market: "TW" | "US"): YahooStockSnapshot {
  const data = financials();
  data.market = market;
  data.currency = market === "TW" ? "TWD" : "USD";
  data.financialCurrency = data.currency;
  data.displaySymbol = market === "TW" ? "9999" : "TEST";
  data.yahooSymbol = market === "TW" ? "9999.TWO" : "TEST";
  return { ...data, normalized: data } as unknown as YahooStockSnapshot;
}

test("Yahoo units do not depend on magnitude, zero debt is valid", () => {
  assert.equal(normalizePercentField(6), 600);
  assert.equal(normalizePercentField(-0.2), -20);
  assert.equal(normalizeDebtToEquity(3).value, 0.03);
  assert.equal(normalizeDebtToEquity(0).value, 0);
  assert.equal(normalizeDebtToEquity(150).value, 1.5);
});
test("FCF is not invented from OCF or EPS; forward EPS does not replace trailing EPS", () => {
  const data = normalizeYahooSummary({ defaultKeyStatistics: { forwardEps: 8, sharesOutstanding: 10 }, financialData: { operatingCashflow: 100 } });
  assert.equal(data.eps, null);
  assert.equal(data.freeCashFlowPerShare, null);
  assert.equal(data.fcfPerShareSource, "missing");
  assert.equal(data.operatingCashFlowPerShare, 10);
});
test("different or unknown reporting currency blocks valuation; ETF also excluded", () => {
  for (const financialCurrency of ["TWD", undefined]) {
    const data = normalizeFinancials({ displaySymbol: "ADR", yahooSymbol: "ADR", market: "US", currency: "USD", quote: { currency: "USD", quoteType: "EQUITY", regularMarketPrice: 100, epsTrailingTwelveMonths: 10 }, summary: { financialData: { financialCurrency } } });
    assert.equal(data.insufficientData, true);
    assert.equal(data.eps, null);
    const input = buildStockInputFromNormalized(data)!;
    const out = toStockAnalysis(analyzeStockInput(input), input, snapshotToNullableMetrics(data));
    assert.equal(out.valuation.fairPrice, null);
    assert.equal(out.valuation.marginOfSafety, null);
    assert.equal(out.radarEligible, false);
  }
  const fund = normalizeFinancials({ displaySymbol: "0050", yahooSymbol: "0050.TW", market: "TW", currency: "TWD", quote: { currency: "TWD", quoteType: "ETF", regularMarketPrice: 100 }, summary: null });
  assert.equal(fund.insufficientData, true);
});
test("DCF is independent of market price and has no EPS fallback", () => {
  const input = buildStockInputFromNormalized(financials())!;
  assert.equal(calculateDCFValue(input, 1, "value").value, calculateDCFValue(input, 10000, "value").value);
  assert.equal(calculateDCFValue({ ...input, freeCashFlowPerShare: 0 }, 100, "value").value, 0);
  assert.ok(calculateDCFValue({ ...input, growthRate: -20 }, 100, "value").value < calculateDCFValue({ ...input, growthRate: 0 }, 100, "value").value);
});
test("PEG target uses PE = PEG times growth, not observed market PEG", () => {
  const input = buildStockInputFromNormalized(financials())!;
  assert.equal(calculatePEGValue({ ...input, growthRate: 1, earningsGrowth: 20, eps: 5, peg: 9 }, "growth"), 120);
});
test("negative and zero financial metrics survive normalization and presentation", () => {
  const data = financials(); data.roe = -2; data.eps = -1; data.revenueGrowth = 0;
  const input = buildStockInputFromNormalized(data)!;
  const out = toStockAnalysis(analyzeStockInput(input), input, snapshotToNullableMetrics(data));
  assert.equal(out.financialProfile.roe, -2);
  assert.equal(out.financialProfile.eps, -1);
  assert.equal(out.financialProfile.growthRate, 0);
});
test("radar never labels overvalued or unvalued securities as undervalued", () => {
  const data = financials(); const input = buildStockInputFromNormalized(data)!;
  const out = toStockAnalysis(analyzeStockInput(input), input, snapshotToNullableMetrics(data));
  assert.ok(buildHomeMarketFeed([out]).undervalued.length > 0);
  out.valuation.marginOfSafety = -10;
  assert.equal(buildHomeMarketFeed([out]).undervalued.length, 0);
  out.valuation.fairPrice = null;
  assert.equal(buildHomeMarketFeed([out]).highQuality.length, 0);
});
test("official directory parsing excludes test issues, funds and warrants", () => {
  assert.deepEqual(parseNasdaqDirectory("Symbol|Security Name|ETF|Test Issue\nZZZ|Company|N|N\nETF|Fund|Y|N\nTEST|Test|N|Y\nWAR|Company Warrants|N|N\nBRK.B|Class B|N|N\nFile Creation Time: now", "Symbol"), ["ZZZ", "BRK-B"]);
  assert.throws(() => parseNasdaqDirectory("error page", "Symbol"));
});
test("directory failure fails explicitly without a fixed stock pool", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  try { await assert.rejects(getUsUniverse()); } finally { globalThis.fetch = original; }
});
test("both markets scan exact symbols, retain good data on failure, and serialize workers", async () => {
  const dir = mkdtempSync(join(tmpdir(), "soarich-test-"));
  process.env.MARKET_DATA_DIR = dir;
  const db = await import("../src/lib/db/market-db");
  const { runMarketScan } = await import("../src/lib/scanner/scanner");
  try {
    for (const market of ["TW", "US"] as const) {
      const snap = snapshot(market);
      const universe = async () => [{ query: snap.displaySymbol, yahooSymbol: snap.yahooSymbol, market }];
      const ok = await runMarketScan(market, { delayMs: 0 }, { universe, snapshot: async (symbol) => { assert.equal(symbol, snap.yahooSymbol); return snap; } });
      assert.equal(ok.succeeded, 1);
      assert.equal(db.getAllStockAnalyses(market).length, 1);
      const failed = await runMarketScan(market, { clearExisting: true, delayMs: 0 }, { universe, snapshot: async () => null });
      assert.equal(failed.failed, 1);
      assert.equal(db.getLatestScanRun(market)?.status, "failed");
      assert.equal(db.getAllStockAnalyses(market).length, 1);
      const lease = db.acquireScanLease(market)!;
      const busy = await runMarketScan(market, {}, { universe, snapshot: async () => { throw new Error("must not run"); } });
      assert.equal(busy.busy, true);
      db.releaseScanLease(market, lease);
      await assert.rejects(runMarketScan(market, {}, { universe: async () => { throw new Error("directory down"); }, snapshot: async () => null }));
      assert.equal(db.getLatestScanRun(market)?.status, "failed");
      assert.equal(db.getAllStockAnalyses(market).length, 1);
    }
    await assert.rejects(runMarketScan("TW", { concurrency: 0 }));
    const { GET } = await import("../src/app/api/stocks/recommendations/route");
    const { NextRequest } = await import("next/server");
    for (const market of ["TW", "US"] as const) {
      db.setScanMeta(`cycle_completed_${market}`, new Date().toISOString());
      const response = await GET(new NextRequest(`http://localhost/api/stocks/recommendations?market=${market}`));
      const body = await response.json();
      assert.ok(body.feed.undervalued.length > 0);
      assert.equal(body.feed.undervalued[0].market, market);
    }
    db.getMarketDb().prepare("UPDATE stock_snapshots SET model_version = 0 WHERE market = 'TW'").run();
    assert.equal(db.hasMarketData("TW"), false);
    const unavailable = await GET(new NextRequest("http://localhost/api/stocks/recommendations?market=TW"));
    const empty = await unavailable.json();
    assert.equal(empty.scanning, false);
    assert.ok(empty.message.includes("失敗"));
    assert.equal((await GET(new NextRequest("http://localhost/api/stocks/recommendations?market=XX"))).status, 400);
  } finally { db.getMarketDb().close(); rmSync(dir, { recursive: true, force: true }); }
});
