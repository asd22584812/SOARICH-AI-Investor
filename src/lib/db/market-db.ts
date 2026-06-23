import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Market, StockAnalysis } from "@/types/stock";
import { calculateRadarScore } from "@/lib/stock/home-feed";

export type ScanStatus = "idle" | "running" | "completed" | "failed";

export interface ScanRunRow {
  id: number;
  market: Market;
  status: ScanStatus;
  started_at: string;
  completed_at: string | null;
  total_count: number;
  processed_count: number;
  error_message: string | null;
}

export interface StockSnapshotRow {
  symbol: string;
  market: Market;
  yahoo_symbol: string;
  name: string;
  currency: string;
  financial_currency: string;
  current_price: number;
  fair_value: number;
  valuation_model: string;
  margin_of_safety: number;
  radar_score: number;
  soarich_rating: number;
  moat_score: number;
  financial_score: number;
  buffett_score: number;
  market_cap: number | null;
  moat_is_estimate: number;
  management_is_estimate: number;
  company_classification: string;
  analysis_json: string;
  scanned_at: string;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "market.db");

let dbInstance: Database.Database | null = null;

function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      total_count INTEGER NOT NULL DEFAULT 0,
      processed_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_snapshots (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      yahoo_symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      financial_currency TEXT NOT NULL,
      current_price REAL NOT NULL,
      fair_value REAL NOT NULL,
      valuation_model TEXT NOT NULL,
      margin_of_safety REAL NOT NULL,
      radar_score REAL NOT NULL,
      soarich_rating REAL NOT NULL,
      moat_score REAL NOT NULL,
      financial_score REAL NOT NULL,
      buffett_score REAL NOT NULL,
      market_cap REAL,
      moat_is_estimate INTEGER NOT NULL DEFAULT 1,
      management_is_estimate INTEGER NOT NULL DEFAULT 1,
      company_classification TEXT NOT NULL,
      analysis_json TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      PRIMARY KEY (symbol, market)
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_market_rating
      ON stock_snapshots (market, soarich_rating DESC);

    CREATE INDEX IF NOT EXISTS idx_snapshots_market_mos
      ON stock_snapshots (market, margin_of_safety DESC);

    CREATE INDEX IF NOT EXISTS idx_snapshots_market_moat
      ON stock_snapshots (market, moat_score DESC);

    CREATE INDEX IF NOT EXISTS idx_snapshots_market_cap
      ON stock_snapshots (market, market_cap DESC);

    CREATE TABLE IF NOT EXISTS scan_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function getMarketDb(): Database.Database {
  if (dbInstance) return dbInstance;
  ensureDbDir();
  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("journal_mode = WAL");
  initSchema(dbInstance);
  return dbInstance;
}

export function hasMarketData(market: Market): boolean {
  const db = getMarketDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM stock_snapshots WHERE market = ?"
    )
    .get(market) as { count: number };
  return row.count > 0;
}

export function getLatestScanRun(market: Market): ScanRunRow | null {
  const db = getMarketDb();
  return (
    (db
      .prepare(
        `SELECT * FROM scan_runs
         WHERE market = ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(market) as ScanRunRow | undefined) ?? null
  );
}

export function getScanStatus(market: Market): {
  status: ScanStatus;
  scanning: boolean;
  processedCount: number;
  totalCount: number;
  lastScannedAt: string | null;
  hasData: boolean;
} {
  const run = getLatestScanRun(market);
  const hasData = hasMarketData(market);

  if (!run) {
    return {
      status: "idle",
      scanning: false,
      processedCount: 0,
      totalCount: 0,
      lastScannedAt: null,
      hasData,
    };
  }

  const lastScannedAt =
    run.status === "completed"
      ? run.completed_at
      : run.status === "running"
        ? run.started_at
        : run.completed_at;

  return {
    status: run.status,
    scanning: run.status === "running",
    processedCount: run.processed_count,
    totalCount: run.total_count,
    lastScannedAt,
    hasData,
  };
}

export function startScanRun(market: Market, totalCount: number): number {
  const db = getMarketDb();
  const startedAt = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO scan_runs (market, status, started_at, total_count, processed_count)
       VALUES (?, 'running', ?, ?, 0)`
    )
    .run(market, startedAt, totalCount);
  return Number(result.lastInsertRowid);
}

export function updateScanProgress(
  runId: number,
  processedCount: number
): void {
  const db = getMarketDb();
  db.prepare(
    "UPDATE scan_runs SET processed_count = ? WHERE id = ?"
  ).run(processedCount, runId);
}

export function completeScanRun(
  runId: number,
  status: "completed" | "failed",
  errorMessage?: string
): void {
  const db = getMarketDb();
  db.prepare(
    `UPDATE scan_runs
     SET status = ?, completed_at = ?, error_message = ?
     WHERE id = ?`
  ).run(status, new Date().toISOString(), errorMessage ?? null, runId);
}

export function clearMarketSnapshots(market: Market): void {
  const db = getMarketDb();
  db.prepare("DELETE FROM stock_snapshots WHERE market = ?").run(market);
}

export function upsertStockSnapshot(
  analysis: StockAnalysis,
  extras: {
    yahooSymbol: string;
    financialCurrency: string;
    valuationModel: string;
    financialScore: number;
    buffettScore: number;
    marketCap: number | null;
    companyClassification: string;
  }
): void {
  const db = getMarketDb();
  const radarScore = calculateRadarScore({
    soarichRating: analysis.totalScore,
    valuationScore: analysis.aiScore.valuation,
    moatScore: analysis.moat.score,
  });

  db.prepare(
    `INSERT INTO stock_snapshots (
      symbol, market, yahoo_symbol, name, currency, financial_currency,
      current_price, fair_value, valuation_model, margin_of_safety,
      radar_score, soarich_rating, moat_score, financial_score, buffett_score,
      market_cap, moat_is_estimate, management_is_estimate,
      company_classification, analysis_json, scanned_at
    ) VALUES (
      @symbol, @market, @yahoo_symbol, @name, @currency, @financial_currency,
      @current_price, @fair_value, @valuation_model, @margin_of_safety,
      @radar_score, @soarich_rating, @moat_score, @financial_score, @buffett_score,
      @market_cap, @moat_is_estimate, @management_is_estimate,
      @company_classification, @analysis_json, @scanned_at
    )
    ON CONFLICT(symbol, market) DO UPDATE SET
      yahoo_symbol = excluded.yahoo_symbol,
      name = excluded.name,
      currency = excluded.currency,
      financial_currency = excluded.financial_currency,
      current_price = excluded.current_price,
      fair_value = excluded.fair_value,
      valuation_model = excluded.valuation_model,
      margin_of_safety = excluded.margin_of_safety,
      radar_score = excluded.radar_score,
      soarich_rating = excluded.soarich_rating,
      moat_score = excluded.moat_score,
      financial_score = excluded.financial_score,
      buffett_score = excluded.buffett_score,
      market_cap = excluded.market_cap,
      moat_is_estimate = excluded.moat_is_estimate,
      management_is_estimate = excluded.management_is_estimate,
      company_classification = excluded.company_classification,
      analysis_json = excluded.analysis_json,
      scanned_at = excluded.scanned_at`
  ).run({
    symbol: analysis.symbol,
    market: analysis.market,
    yahoo_symbol: extras.yahooSymbol,
    name: analysis.name,
    currency: analysis.currency,
    financial_currency: extras.financialCurrency,
    current_price: analysis.price,
    fair_value: analysis.valuation.fairPrice,
    valuation_model: extras.valuationModel,
    margin_of_safety: analysis.valuation.marginOfSafety,
    radar_score: radarScore,
    soarich_rating: analysis.totalScore,
    moat_score: analysis.moat.score,
    financial_score: extras.financialScore,
    buffett_score: extras.buffettScore,
    market_cap: extras.marketCap,
    moat_is_estimate: analysis.moat.isEstimate ? 1 : 0,
    management_is_estimate: analysis.managementIsEstimate ? 1 : 0,
    company_classification: extras.companyClassification,
    analysis_json: JSON.stringify(analysis),
    scanned_at: new Date().toISOString(),
  });
}

export function getAllStockAnalyses(market: Market): StockAnalysis[] {
  const db = getMarketDb();
  const rows = db
    .prepare(
      `SELECT analysis_json FROM stock_snapshots
       WHERE market = ?
       ORDER BY soarich_rating DESC`
    )
    .all(market) as { analysis_json: string }[];

  return rows
    .map((row) => {
      try {
        return JSON.parse(row.analysis_json) as StockAnalysis;
      } catch {
        return null;
      }
    })
    .filter((item): item is StockAnalysis => item !== null);
}

export function getPopularStocks(
  market: Market,
  limit = 20
): StockAnalysis[] {
  const db = getMarketDb();
  const rows = db
    .prepare(
      `SELECT analysis_json FROM stock_snapshots
       WHERE market = ?
       ORDER BY
         CASE WHEN market_cap IS NULL THEN 1 ELSE 0 END,
         market_cap DESC,
         soarich_rating DESC
       LIMIT ?`
    )
    .all(market, limit) as { analysis_json: string }[];

  return rows
    .map((row) => {
      try {
        return JSON.parse(row.analysis_json) as StockAnalysis;
      } catch {
        return null;
      }
    })
    .filter((item): item is StockAnalysis => item !== null);
}

export function setScanMeta(key: string, value: string): void {
  const db = getMarketDb();
  db.prepare(
    `INSERT INTO scan_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function getScanMeta(key: string): string | null {
  const db = getMarketDb();
  const row = db
    .prepare("SELECT value FROM scan_meta WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
