import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TWSE_URL = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L";
const TPEX_URL = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes";

const INDUSTRY = {
  "01": "水泥工業", "02": "食品工業", "03": "塑膠工業", "04": "紡織纖維",
  "05": "電機機械", "06": "電器電纜", "08": "玻璃陶瓷", "09": "造紙工業",
  "10": "鋼鐵工業", "11": "橡膠工業", "12": "汽車工業", "13": "電子工業",
  "14": "建材營造業", "15": "航運業", "16": "觀光餐旅", "17": "金融保險業",
  "18": "貿易百貨業", "19": "綜合", "20": "其他業", "21": "化學工業",
  "22": "生技醫療業", "23": "油電燃氣業", "24": "半導體業", "25": "電腦及週邊設備業",
  "26": "光電業", "27": "通信網路業", "28": "電子零組件業", "29": "電子通路業",
  "30": "資訊服務業", "31": "其他電子業", "32": "文化創意業", "33": "農業科技業",
  "34": "電子商務", "35": "綠能環保", "36": "數位雲端", "37": "運動休閒",
  "38": "居家生活", "80": "管理股票", "00": "其他",
};

function cleanName(value) {
  return String(value ?? "").replace(/\*/g, "").trim();
}

function isEquitySymbol(symbol) {
  return /^\d{4}$/.test(symbol);
}

async function fetchTwse() {
  const rows = await fetch(TWSE_URL).then((r) => r.json());
  return rows
    .filter((row) => isEquitySymbol(String(row["公司代號"] ?? "")))
    .map((row) => ({
      symbol: String(row["公司代號"]),
      name: cleanName(row["公司名稱"]),
      shortName: cleanName(row["公司簡稱"] || row["公司名稱"]),
      industry: INDUSTRY[String(row["產業別"] ?? "").padStart(2, "0")] ?? "未分類",
      exchange: "TWSE",
      yahooSuffix: ".TW",
    }));
}

async function fetchTpex() {
  const rows = await fetch(TPEX_URL).then((r) => r.json());
  const map = new Map();
  for (const row of rows) {
    const symbol = String(row.SecuritiesCompanyCode ?? "");
    if (!isEquitySymbol(symbol) || symbol.startsWith("00")) continue;
    map.set(symbol, {
      symbol,
      name: cleanName(row.CompanyName),
      shortName: cleanName(row.CompanyName),
      industry: "上櫃",
      exchange: "TPEx",
      yahooSuffix: ".TWO",
    });
  }
  return [...map.values()];
}

const twse = await fetchTwse();
const tpex = await fetchTpex();
const merged = [...twse, ...tpex].sort((a, b) => a.symbol.localeCompare(b.symbol));

const out = resolve("src/data/fallbackTaiwanStocks.json");
writeFileSync(out, JSON.stringify(merged, null, 2), "utf8");
console.log(`Wrote ${merged.length} stocks (${twse.length} TWSE + ${tpex.length} TPEx) to ${out}`);
