import { analyzeStockInput } from "../src/lib/stock/analyzer.ts";
import { buildStockInputFromNormalized } from "../src/lib/stock/stock-input-builder.ts";
import { searchStock } from "../src/lib/stock/yahoo.ts";

const TICKERS = [
  "NVDA",
  "AAPL",
  "MSFT",
  "GOOGL",
  "META",
  "TSLA",
  "2330",
  "2327",
  "2454",
  "2317",
  "2308",
];

async function validateTicker(query) {
  const snapshot = await searchStock(query);
  if (!snapshot?.normalized) {
    console.log(`\n=== ${query} ===`);
    console.log("FAILED: no snapshot");
    return;
  }

  const normalized = snapshot.normalized;
  const stockInput = buildStockInputFromNormalized(normalized);
  if (!stockInput) {
    console.log(`\n=== ${query} ===`);
    console.log("FAILED: no stock input");
    return;
  }

  const result = analyzeStockInput(stockInput);

  console.log(`\n=== ${query} ${stockInput.name} ===`);
  console.log(
    JSON.stringify(
      {
        rawYahoo: {
          price: snapshot.currentPrice,
          eps: snapshot.eps,
          pe: snapshot.pe,
          pb: snapshot.pb,
          roe: snapshot.roe,
          roa: snapshot.roa,
          revenueGrowth: snapshot.revenueGrowth,
          grossMargin: snapshot.grossMargin,
          operatingMargin: snapshot.operatingMargin,
          debtToEquity: snapshot.debtToEquity,
          fcfPerShare: snapshot.freeCashFlowPerShare,
        },
        normalized: {
          eps: normalized.eps,
          pe: normalized.pe,
          pb: normalized.pb,
          roe: normalized.roe,
          roa: normalized.roa,
          revenueGrowth: normalized.revenueGrowth,
          grossMargin: normalized.grossMargin,
          operatingMargin: normalized.operatingMargin,
          debtToEquity: normalized.debtToEquity,
          fcfPerShare: normalized.freeCashFlowPerShare,
          fcfSource: normalized.fcfPerShareSource,
          missingFields: normalized.missingCriticalFields,
        },
        companyClassification: result.companyClassification,
        fairValue: Math.round(result.valuation.fairValue),
        marginOfSafety: Number(result.valuation.marginOfSafety.toFixed(1)),
        moatScore: result.moat.moatScore,
        financialScore: result.financialScore,
        buffettScore: result.buffettScore,
        soarichRating: result.totalScore,
        insufficientData: result.insufficientData,
        radarEligible: result.radarEligible,
        valuationScore: result.valuationScore,
        buySignal: result.buySignal.label,
      },
      null,
      2
    )
  );
}

for (const ticker of TICKERS) {
  await validateTicker(ticker);
}
