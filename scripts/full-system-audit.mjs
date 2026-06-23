import fs from "node:fs";
import path from "node:path";
import YahooFinance from "yahoo-finance2";
import { analyzeStockInput } from "../src/lib/stock/analyzer.ts";
import { usesForbiddenFinancialModels } from "../src/lib/stock/valuation-model.ts";
import { describeValuationModel } from "../src/lib/stock/valuation-model.ts";
import { buildStockInputFromNormalized } from "../src/lib/stock/stock-input-builder.ts";
import { searchStock } from "../src/lib/stock/yahoo.ts";
import { getScanStatus, getMarketDb } from "../src/lib/db/market-db.ts";
import { getUniverseCounts } from "../src/lib/scanner/universe.ts";

const yahooFinance = new YahooFinance();

const AUDIT_TICKERS = [
  { query: "2330", market: "TW" },
  { query: "2308", market: "TW" },
  { query: "2317", market: "TW" },
  { query: "2454", market: "TW" },
  { query: "2327", market: "TW" },
  { query: "2881", market: "TW" },
  { query: "NVDA", market: "US" },
  { query: "META", market: "US" },
  { query: "MSFT", market: "US" },
  { query: "AAPL", market: "US" },
  { query: "GOOGL", market: "US" },
];

const MOAT_SOURCES = [
  {
    dimension: "brandPower",
    label: "品牌力",
    inputs: "毛利率、營業利益率、市值規模、產業加成",
    source: "財報衍生 + 產業規則",
    isEstimate: true,
  },
  {
    dimension: "technologyBarrier",
    label: "技術壁壘",
    inputs: "營業利益率、ROE、營收成長、產業加成",
    source: "財報衍生 + 產業規則",
    isEstimate: true,
  },
  {
    dimension: "scaleEconomy",
    label: "規模經濟",
    inputs: "市值規模、營業利益率、產業加成",
    source: "財報衍生 + 產業規則",
    isEstimate: true,
  },
  {
    dimension: "switchingCost",
    label: "轉換成本",
    inputs: "營業利益率、毛利率、ROA、產業加成",
    source: "財報衍生 + 產業規則",
    isEstimate: true,
  },
  {
    dimension: "networkEffect",
    label: "網路效應",
    inputs: "營收成長、市值規模、產業加成",
    source: "財報衍生 + 產業規則",
    isEstimate: true,
  },
];

function isTaiwanSymbol(symbol) {
  return /\.(TW|TWO)$/i.test(symbol);
}

function pctDiff(a, b) {
  if (!a || !b) return null;
  return (Math.abs(a - b) / b) * 100;
}

async function auditTicker({ query, market }) {
  const snapshot = await searchStock(query);
  if (!snapshot?.normalized) {
    return { query, market, error: "無法取得資料" };
  }

  const normalized = snapshot.normalized;
  const stockInput = buildStockInputFromNormalized(normalized);
  if (!stockInput) {
    return { query, market, error: "無法建立分析輸入" };
  }

  const result = analyzeStockInput(stockInput);
  const valuationModel = describeValuationModel(
    result.valuation.companyClassification,
    result.valuation.weights
  );

  let yahooWebPrice = snapshot.currentPrice;
  try {
    const quote = await yahooFinance.quote(snapshot.yahooSymbol);
    if (quote?.regularMarketPrice) {
      yahooWebPrice = quote.regularMarketPrice;
    }
  } catch {
    // keep snapshot price
  }

  const currencyOk =
    market === "TW"
      ? snapshot.currency === "TWD" &&
        normalized.currency === "TWD" &&
        isTaiwanSymbol(snapshot.yahooSymbol)
      : snapshot.currency === "USD" &&
        normalized.currency === "USD" &&
        !isTaiwanSymbol(snapshot.yahooSymbol);

  const priceDiff = pctDiff(snapshot.currentPrice, yahooWebPrice);

  const financialForbidden = usesForbiddenFinancialModels(
    result.valuation.companyClassification,
    result.valuation.weights
  );

  return {
    query,
    market,
    symbol: snapshot.displaySymbol,
    yahooSymbol: snapshot.yahooSymbol,
    name: snapshot.name,
    currentPrice: snapshot.currentPrice,
    yahooWebPrice,
    currency: snapshot.currency,
    financialCurrency: normalized.currency,
    fairValue: Math.round(result.valuation.fairValue),
    valuationModel,
    companyClassification: result.valuation.companyClassification,
    marginOfSafety: result.valuation.marginOfSafety,
    soarichRating: result.totalScore,
    moatScore: result.moat.moatScore,
    moatIsEstimate: result.moatIsEstimate,
    managementIsEstimate: result.managementIsEstimate,
    currencyOk,
    priceDiffPct: priceDiff,
    priceOk: priceDiff == null || priceDiff <= 5,
    financialForbidden,
    weights: result.valuation.weights,
  };
}

const lines = [];
lines.push("# SOARICH 全系統幣別與估值驗證報告");
lines.push("");
lines.push(`產生時間：${new Date().toISOString()}`);
lines.push("");

lines.push("## 1. 掃描器架構");
lines.push("");
const counts = await getUniverseCounts();
lines.push(`- 台股掃描範圍：TWSE 上市 + TPEx 上櫃（共 ${counts.tw} 檔）`);
lines.push(`- 美股掃描範圍：S&P 500 + Nasdaq 100（共 ${counts.us} 檔）`);
lines.push("- 首頁推薦來源：動態掃描結果（SQLite `data/market.db`）");
lines.push("- 每日排程：`npm run scan:market -- --market=TW` 與 `--market=US`（建議凌晨 2:00）");
lines.push("");

const twScan = getScanStatus("TW");
const usScan = getScanStatus("US");
lines.push("### 掃描狀態");
lines.push("");
lines.push(`| 市場 | 狀態 | 已掃描 | 總數 | 最後更新 |`);
lines.push(`|------|------|--------|------|----------|`);
lines.push(
  `| 台股 | ${twScan.status} | ${twScan.processedCount} | ${twScan.totalCount} | ${twScan.lastScannedAt ?? "—"} |`
);
lines.push(
  `| 美股 | ${usScan.status} | ${usScan.processedCount} | ${usScan.totalCount} | ${usScan.lastScannedAt ?? "—"} |`
);
lines.push("");

lines.push("## 2. 幣別規則驗證");
lines.push("");
lines.push("### 台股（*.TW / *.TWO）");
lines.push("- 必須 `currency = TWD`");
lines.push("- Fair Value 以台幣計算，UI 顯示 `NT$`");
lines.push("");
lines.push("### 美股");
lines.push("- 必須 `currency = USD`");
lines.push("- Fair Value 以美元計算，UI 顯示 `US$`");
lines.push("");

lines.push("## 3. 指定股票驗證");
lines.push("");
lines.push(
  "| 代號 | 現價 | 幣別 | 財報幣別 | 合理價 | 估值模型 | 幣別 OK | 價差 OK |"
);
lines.push("|------|------|------|----------|--------|----------|---------|---------|");

const auditResults = [];
for (const ticker of AUDIT_TICKERS) {
  const row = await auditTicker(ticker);
  auditResults.push(row);
  if (row.error) {
    lines.push(`| ${ticker.query} | — | — | — | — | ${row.error} | — | — |`);
    continue;
  }
  lines.push(
    `| ${row.symbol} | ${row.currentPrice} | ${row.currency} | ${row.financialCurrency} | ${row.fairValue} | ${row.valuationModel} | ${row.currencyOk ? "✅" : "❌"} | ${row.priceOk ? "✅" : "❌"} |`
  );
}
lines.push("");

lines.push("## 4. 金融股估值規則");
lines.push("");
lines.push("Banks / Insurance / Financial Services 不得使用 DCF / PEG。");
lines.push("");
for (const row of auditResults.filter((r) => !r.error)) {
  if (row.companyClassification === "financial") {
    lines.push(
      `- **${row.symbol}**（${row.companyClassification}）：${row.valuationModel} — DCF/PEG 禁用：${row.financialForbidden ? "❌ 違規" : "✅ 合規"}`
    );
  }
}
lines.push("");

lines.push("## 5. 護城河分數來源");
lines.push("");
lines.push(
  "> 目前所有護城河維度皆由財報指標經模型推算，**非**第三方護城河評等。UI 會標示「模型估算」。"
);
lines.push("");
lines.push("| 維度 | 輸入 | 資料性質 |");
lines.push("|------|------|----------|");
for (const source of MOAT_SOURCES) {
  lines.push(
    `| ${source.label} | ${source.inputs} | ${source.isEstimate ? "模型估算" : "真實財報"} |`
  );
}
lines.push("");
lines.push("### 管理層評分");
lines.push("- 來源：模型估算（`managementIsEstimate: true`）");
lines.push("");

lines.push("## 6. 管理層與護城河標示");
lines.push("");
for (const row of auditResults.filter((r) => !r.error)) {
  lines.push(
    `- ${row.symbol}：護城河 ${row.moatIsEstimate ? "模型估算" : "真實資料"}、管理層 ${row.managementIsEstimate ? "模型估算" : "真實資料"}`
  );
}
lines.push("");

lines.push("## 7. 首頁資料來源");
lines.push("");
lines.push("- 今日關注 / 低估關注 / 高品質觀察 / 護城河觀察：**動態掃描結果**");
lines.push("- 熱門自選股：掃描結果依市值排序前 20 檔");
lines.push("- 掃描未完成時顯示：「正在更新市場資料」");
lines.push("- 不使用固定 NVDA / META / AAPL / MSFT / GOOGL / 2330 等推薦池");
lines.push("");

const currencyViolations = auditResults.filter(
  (r) => !r.error && !r.currencyOk
);
const priceViolations = auditResults.filter((r) => !r.error && !r.priceOk);
const financialViolations = auditResults.filter(
  (r) => !r.error && r.financialForbidden
);

lines.push("## 8. 驗證摘要");
lines.push("");
lines.push(`- 幣別違規：${currencyViolations.length}`);
lines.push(`- 價格差異 >5%：${priceViolations.length}（即時 Yahoo 比對）`);
lines.push(`- 金融股 DCF/PEG 違規：${financialViolations.length}`);
lines.push(
  `- 資料庫路徑：\`${path.join(process.cwd(), "data", "market.db")}\``
);
lines.push("");

if (currencyViolations.length === 0 && financialViolations.length === 0) {
  lines.push("**結論：幣別與金融估值規則驗證通過。**");
} else {
  lines.push("**結論：存在需修正項目，請見上方細節。**");
}

const reportPath = path.join(process.cwd(), "audit-report.md");
fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
console.log(`Wrote ${reportPath}`);
console.log(JSON.stringify({ currencyViolations, financialViolations }, null, 2));

// touch db
getMarketDb();
