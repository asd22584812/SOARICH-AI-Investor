import assert from "node:assert/strict";
import {
  buildHomeMarketFeed,
  calculateRadarScore,
} from "../src/lib/stock/home-feed.ts";

function mockAnalysis(symbol, overrides = {}) {
  return {
    symbol,
    name: symbol,
    market: "US",
    price: 100,
    change: 1,
    changePercent: 1,
    currency: "USD",
    industry: null,
    aiScore: {
      moat: 80,
      financials: 75,
      growth: 70,
      management: 70,
      valuation: 72,
    },
    totalScore: 78,
    entryScore: 70,
    entryLabel: "接近合理價",
    entrySignal: "watch",
    valuation: {
      safetyPrice: 80,
      fairPrice: 110,
      optimisticPrice: 130,
      dcfValue: 110,
      marginOfSafety: 10,
    },
    moat: {
      score: 82,
      brand: 80,
      technology: 80,
      networkEffect: 70,
      scaleEconomy: 75,
      switchingCost: 70,
      summary: "mock",
    },
    financialProfile: {
      score: 75,
      roe: 20,
      roa: 10,
      grossMargin: 40,
      operatingMargin: 25,
      debtToEquity: 0.5,
      eps: 5,
      growthRate: 12,
      pe: 20,
      pb: 5,
      marketCap: 1_000_000,
    },
    keyPersonRisk: {
      level: "low",
      ceo: "mock",
      founder: "mock",
      succession: "mock",
      teamMaturity: "mock",
    },
    buffett: {
      score: 75,
      roe: 20,
      freeCashFlow: 80,
      debtRatio: 70,
      moat: 80,
      profitStability: 75,
      summary: "mock",
    },
    aiConclusion: {
      isUndervalued: true,
      suitableForDCA: true,
      undervaluedPercent: 10,
      highlights: [],
      mainRisks: [],
      growthOutlook: "mock",
      summary: "mock",
    },
    radarEligible: true,
    undervaluedFocusEligible: true,
    highQualityWatchEligible: true,
    managementIsEstimate: false,
    ...overrides,
  };
}

console.log("=== calculateRadarScore ===");
const radar = calculateRadarScore({
  soarichRating: 80,
  valuationScore: 70,
  moatScore: 90,
});
assert.equal(radar, Math.round(80 * 0.5 + 70 * 0.3 + 90 * 0.2));
console.log("radar score:", radar, "OK");

console.log("\n=== today focus relaxed threshold ===");
const baseValuation = {
  safetyPrice: 80,
  fairPrice: 110,
  optimisticPrice: 130,
  dcfValue: 110,
  marginOfSafety: -25,
};
const feedSmall = buildHomeMarketFeed([
  mockAnalysis("RELAXED_ONLY", {
    totalScore: 66,
    valuation: baseValuation,
  }),
  mockAnalysis("A", {
    totalScore: 72,
    valuation: { ...baseValuation, marginOfSafety: -15 },
  }),
  mockAnalysis("B", {
    totalScore: 75,
    valuation: { ...baseValuation, marginOfSafety: 5 },
  }),
]);
assert.ok(
  feedSmall.todayFocus.some((item) => item.symbol === "RELAXED_ONLY"),
  "relaxed today focus should include rating 66 / MOS -25 when strict pool is small"
);
console.log("todayFocus count:", feedSmall.todayFocus.length, "OK");

console.log("\n=== cross-section dedup max 2 ===");
const shared = mockAnalysis("SHARED", { totalScore: 90, moat: { ...mockAnalysis("X").moat, score: 95 } });
const feedDup = buildHomeMarketFeed([
  shared,
  mockAnalysis("U1", { valuation: { ...shared.valuation, marginOfSafety: 30 } }),
  mockAnalysis("U2", { valuation: { ...shared.valuation, marginOfSafety: 25 } }),
  mockAnalysis("U3", { valuation: { ...shared.valuation, marginOfSafety: 20 } }),
  mockAnalysis("U4", { valuation: { ...shared.valuation, marginOfSafety: 15 } }),
  mockAnalysis("H1", { totalScore: 88 }),
  mockAnalysis("H2", { totalScore: 86 }),
  mockAnalysis("M1", { moat: { ...shared.moat, score: 88 } }),
]);

const appearances = new Map();
for (const section of Object.values(feedDup)) {
  for (const card of section) {
    appearances.set(card.symbol, (appearances.get(card.symbol) ?? 0) + 1);
  }
}
for (const [symbol, count] of appearances) {
  assert.ok(count <= 2, `${symbol} appears in ${count} sections`);
}
console.log("max appearances per symbol <= 2 OK");

console.log("\n=== sort keys ===");
const base = mockAnalysis("BASE");
const sortPool = [
  mockAnalysis("MOS_HIGH", {
    valuation: { ...base.valuation, marginOfSafety: 40 },
  }),
  mockAnalysis("MOS_LOW", {
    valuation: { ...base.valuation, marginOfSafety: -5 },
  }),
  mockAnalysis("RATING_HIGH", { totalScore: 95 }),
  mockAnalysis("RATING_LOW", { totalScore: 60 }),
  mockAnalysis("MOAT_HIGH", {
    moat: { ...base.moat, score: 99 },
  }),
  mockAnalysis("MOAT_LOW", {
    moat: { ...base.moat, score: 50 },
  }),
  mockAnalysis("MOAT_FILL_A", {
    totalScore: 62,
    valuation: { ...base.valuation, marginOfSafety: -40 },
    moat: { ...base.moat, score: 88 },
  }),
  mockAnalysis("MOAT_FILL_B", {
    totalScore: 61,
    valuation: { ...base.valuation, marginOfSafety: -40 },
    moat: { ...base.moat, score: 86 },
  }),
];
const feedSort = buildHomeMarketFeed(sortPool);
assert.equal(feedSort.undervalued[0]?.symbol, "MOS_HIGH");
assert.ok(feedSort.moat.length > 0, "moat section should not be empty");

const moatScores = feedSort.moat.map(
  (card) => sortPool.find((item) => item.symbol === card.symbol)?.moat.score ?? 0
);
assert.ok(
  moatScores.every((score, index) => index === 0 || moatScores[index - 1] >= score),
  "moat section should be sorted by Moat Score"
);

const highQualityScores = feedSort.highQuality.map(
  (card) => sortPool.find((item) => item.symbol === card.symbol)?.totalScore ?? 0
);
assert.ok(
  highQualityScores.every(
    (score, index) => index === 0 || highQualityScores[index - 1] >= score
  ),
  "highQuality should be sorted by SOARICH Rating"
);
console.log("section sort order OK");

console.log("\nAll home-feed checks passed.");
