import type { Market } from "@/types/stock";
import {
  analyzeStockInput,
  toStockAnalysis,
} from "@/lib/stock/analyzer";
import {
  clearMarketSnapshots,
  completeScanRun,
  startScanRun,
  updateScanProgress,
  upsertStockSnapshot,
  setScanMeta,
} from "@/lib/db/market-db";
import { describeValuationModel } from "@/lib/stock/valuation-model";
import {
  buildStockInputFromYahoo,
  snapshotToNullableMetrics,
} from "@/lib/stock/stock-input-builder";
import { searchStock } from "@/lib/stock/yahoo";
import { getMarketUniverse } from "@/lib/scanner/universe";

const DEFAULT_DELAY_MS = 300;
const DEFAULT_CONCURRENCY = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ScanOptions {
  limit?: number;
  delayMs?: number;
  concurrency?: number;
  clearExisting?: boolean;
}

async function analyzeUniverseSymbol(query: string) {
  const snapshot = await searchStock(query);
  if (!snapshot?.normalized) return null;

  const stockInput = buildStockInputFromYahoo(snapshot);
  if (!stockInput) return null;

  const result = analyzeStockInput(stockInput);
  const analysis = toStockAnalysis(
    result,
    stockInput,
    snapshotToNullableMetrics(snapshot.normalized)
  );

  const valuationModel = describeValuationModel(
    result.valuation.companyClassification,
    result.valuation.weights
  );

  return {
    analysis,
    yahooSymbol: snapshot.yahooSymbol,
    financialCurrency: snapshot.normalized.currency,
    valuationModel,
    financialScore: result.financialScore,
    buffettScore: result.buffettScore,
    marketCap: snapshot.normalized.marketCap,
    companyClassification: result.valuation.companyClassification,
  };
}

export async function runMarketScan(
  market: Market,
  options: ScanOptions = {}
): Promise<{ runId: number; processed: number; total: number }> {
  const universe = await getMarketUniverse(market);
  const total = options.limit
    ? Math.min(options.limit, universe.length)
    : universe.length;
  const targets = universe.slice(0, total);
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  if (options.clearExisting !== false) {
    clearMarketSnapshots(market);
  }

  const runId = startScanRun(market, total);
  setScanMeta(`last_scan_started_${market}`, new Date().toISOString());

  let processed = 0;
  let pointer = 0;
  let failed = false;
  let errorMessage: string | undefined;

  async function worker(): Promise<void> {
    while (pointer < targets.length) {
      const index = pointer++;
      const target = targets[index];

      try {
        const row = await analyzeUniverseSymbol(target.query);
        if (row && row.analysis.market === market) {
          upsertStockSnapshot(row.analysis, {
            yahooSymbol: row.yahooSymbol,
            financialCurrency: row.financialCurrency,
            valuationModel: row.valuationModel,
            financialScore: row.financialScore,
            buffettScore: row.buffettScore,
            marketCap: row.marketCap,
            companyClassification: row.companyClassification,
          });
        }
      } catch (error) {
        failed = true;
        errorMessage =
          error instanceof Error ? error.message : "Unknown scan error";
      }

      processed += 1;
      if (processed % 10 === 0 || processed === total) {
        updateScanProgress(runId, processed);
      }

      await sleep(delayMs);
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, targets.length) }, () =>
        worker()
      )
    );
    completeScanRun(runId, failed ? "failed" : "completed", errorMessage);
    setScanMeta(`last_scan_completed_${market}`, new Date().toISOString());
  } catch (error) {
    completeScanRun(
      runId,
      "failed",
      error instanceof Error ? error.message : "Scan aborted"
    );
    throw error;
  }

  return { runId, processed, total };
}
