import type { Market, StockAnalysis } from "@/types/stock";
import {
  analyzeStockInput,
  toStockAnalysis,
} from "@/lib/stock/analyzer";
import { describeValuationModel } from "@/lib/stock/valuation-model";
import {
  buildStockInputFromYahoo,
  snapshotToNullableMetrics,
} from "@/lib/stock/stock-input-builder";
import { searchStock } from "@/lib/stock/yahoo";
import { getPriorityUniverse } from "./priority-universe";
import {
  upsertStockSnapshot,
  setScanMeta,
} from "@/lib/db/market-db";

export async function analyzeAndOptionallyPersist(
  query: string,
  market: Market,
  persist = true
): Promise<StockAnalysis | null> {
  const snapshot = await searchStock(query);
  if (!snapshot?.normalized) return null;
  if (snapshot.market !== market) return null;

  const stockInput = buildStockInputFromYahoo(snapshot);
  if (!stockInput) return null;

  const result = analyzeStockInput(stockInput);
  const analysis = toStockAnalysis(
    result,
    stockInput,
    snapshotToNullableMetrics(snapshot.normalized)
  );

  if (persist) {
    upsertStockSnapshot(analysis, {
      yahooSymbol: snapshot.yahooSymbol,
      financialCurrency: snapshot.normalized.currency,
      valuationModel: describeValuationModel(
        result.valuation.companyClassification,
        result.valuation.weights
      ),
      financialScore: result.financialScore,
      buffettScore: result.buffettScore,
      marketCap: snapshot.normalized.marketCap,
      companyClassification: result.valuation.companyClassification,
    });
  }

  return analysis;
}

/** 資料庫空或過舊時，即時分析優先池並寫入 DB，讓首頁立刻有內容 */
export async function bootstrapMarketFeed(
  market: Market,
  limit = 24
): Promise<StockAnalysis[]> {
  const targets = getPriorityUniverse(market).slice(0, limit);
  const results: StockAnalysis[] = [];

  for (const target of targets) {
    try {
      const analysis = await analyzeAndOptionallyPersist(
        target.query,
        market,
        true
      );
      if (analysis) results.push(analysis);
    } catch {
      // skip failed symbol
    }
  }

  setScanMeta(`last_bootstrap_${market}`, new Date().toISOString());
  return results;
}
