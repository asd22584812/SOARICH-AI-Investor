import { getTaiwanDirectoryWarnings } from "@/lib/stock/twStockList";
import type { Market } from "@/types/stock";
import { analyzeStockInput, toStockAnalysis } from "@/lib/stock/analyzer";
import {
  completeScanRun, startScanRun, updateScanProgress, upsertStockSnapshot,
  setScanMeta, getScanMeta, acquireScanLease, renewScanLease, releaseScanLease,
} from "@/lib/db/market-db";
import { describeValuationModel } from "@/lib/stock/valuation-model";
import { buildStockInputFromYahoo, snapshotToNullableMetrics } from "@/lib/stock/stock-input-builder";
import { fetchExactStock } from "@/lib/stock/yahoo";
import { getMarketUniverse, type UniverseSymbol } from "@/lib/scanner/universe";

export interface ScanOptions {
  limit?: number;
  offset?: number;
  delayMs?: number;
  concurrency?: number;
  /** Retained for CLI compatibility. Refreshes never delete usable snapshots first. */
  clearExisting?: boolean;
}
export interface ScanDependencies {
  universe: typeof getMarketUniverse;
  snapshot: typeof fetchExactStock;
}
const dependencies: ScanDependencies = { universe: getMarketUniverse, snapshot: fetchExactStock };

export async function runMarketScan(
  market: Market, options: ScanOptions = {}, deps: ScanDependencies = dependencies,
) {
  const concurrency = options.concurrency ?? 2;
  const delayMs = options.delayMs ?? 300;
  const offset = options.offset ?? 0;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10 ||
      !Number.isInteger(offset) || offset < 0 || !Number.isFinite(delayMs) || delayMs < 0 ||
      (options.limit != null && (!Number.isInteger(options.limit) || options.limit < 1))) {
    throw new Error("Invalid scan options");
  }
  let lease = acquireScanLease(market);
  if (!lease) return { runId: 0, processed: 0, succeeded: 0, failed: 0, total: 0, busy: true };
  const runId = startScanRun(market, 0);
  let processed = 0, succeeded = 0, failed = 0;
  const failures: string[] = [];
  try {
    // Freeze the directory across batches; never select from a hard-coded pool.
    const cached = getScanMeta(`universe_${market}`);
    const universe: UniverseSymbol[] = offset > 0 && cached ? JSON.parse(cached) : await deps.universe(market);
    if (!(offset > 0 && cached)) setScanMeta(`directory_warning_${market}`, market === "TW" ? getTaiwanDirectoryWarnings().join("；") : "");
    if (!universe.length) throw new Error("Exchange directory is empty");
    setScanMeta(`universe_${market}`, JSON.stringify(universe));
    const targets = universe.slice(offset, options.limit ? offset + options.limit : undefined);
    const { getMarketDb } = await import("@/lib/db/market-db");
    getMarketDb().prepare("UPDATE scan_runs SET total_count = ? WHERE id = ?").run(targets.length, runId);
    let pointer = 0;
    async function worker() {
      while (pointer < targets.length) {
        const target = targets[pointer++];
        try {
          const snapshot = await deps.snapshot(target.yahooSymbol ?? target.query);
          if (!snapshot || snapshot.market !== market) throw new Error("Yahoo 報價缺漏或市場不符");
          const input = buildStockInputFromYahoo(snapshot);
          if (!input) throw new Error("Missing current price");
          const result = analyzeStockInput(input);
          const analysis = toStockAnalysis(result, input, snapshotToNullableMetrics(snapshot.normalized));
          // A quote alone is not a successful financial-data refresh.
          if (result.insufficientData) throw new Error(`財務資料不足或幣別不相容：${snapshot.normalized.missingCriticalFields.join(", ")}`);
          upsertStockSnapshot(analysis, {
            yahooSymbol: snapshot.yahooSymbol,
            financialCurrency: snapshot.normalized.financialCurrency ?? "unknown",
            valuationModel: describeValuationModel(result.valuation.companyClassification, result.valuation.weights),
            financialScore: result.financialScore, buffettScore: result.buffettScore,
            marketCap: snapshot.normalized.marketCap, companyClassification: result.valuation.companyClassification,
          });
          succeeded++;
        } catch (error) {
          failed++;
          if (failures.length < 2) failures.push(`${target.query}：${error instanceof Error ? error.message : "資料取得失敗"}`);
        }
        processed++;
        updateScanProgress(runId, processed);
        lease = renewScanLease(market, lease!);
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
    const next = offset + processed;
    // Advance even when individual securities are unsuitable; retry the cycle later.
    setScanMeta(`cursor_${market}`, String(next >= universe.length ? 0 : next));
    setScanMeta(`cycle_completed_${market}`, next >= universe.length && succeeded > 0 ? new Date().toISOString() : "");
    const error = failed ? `${failed}/${processed} 檔資料失敗；${failures.join("；")}` : undefined;
    completeScanRun(runId, succeeded > 0 ? "completed" : "failed", error);
    setScanMeta(`batch_at_${market}`, new Date().toISOString());
    setScanMeta(`batch_error_${market}`, error ?? "");
    return { runId, processed, succeeded, failed, total: universe.length, busy: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    completeScanRun(runId, "failed", message);
    setScanMeta(`batch_at_${market}`, new Date().toISOString());
    setScanMeta(`batch_error_${market}`, message);
    throw error;
  } finally { releaseScanLease(market, lease!); }
}

/** Bounded request work, with a persisted cursor and cross-process lease. */
export async function refreshMarketBatch(market: Market, requestedOffset?: number): Promise<void> {
  const completed = Date.parse(getScanMeta(`cycle_completed_${market}`) ?? "");
  if (Date.now() - completed < 24 * 60 * 60 * 1000) return;
  const last = Date.parse(getScanMeta(`batch_at_${market}`) ?? "");
  const error = getScanMeta(`batch_error_${market}`);
  if (Date.now() - last < (error ? 60000 : 5000)) return;
  const offset = requestedOffset ?? Number(getScanMeta(`cursor_${market}`) ?? 0);
  await runMarketScan(market, { offset, limit: 2, concurrency: 2, delayMs: 0 }).catch(() => {});
}
