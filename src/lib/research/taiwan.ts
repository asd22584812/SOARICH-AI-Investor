import { sourceJson, type OfficialFinancials } from "./official";
export type Row = Record<string, string>;
export const TWSE = "https://openapi.twse.com.tw/v1";
export const TPEX = "https://www.tpex.org.tw/openapi/v1";
export const TW_INCOME = `${TWSE}/opendata/t187ap06_L_ci`;
export const OTC_INCOME = `${TPEX}/mopsfin_t187ap06_O_ci`;
export const TW_QUOTES = `${TWSE}/exchangeReport/STOCK_DAY_ALL`;
export const TW_RATIOS = `${TWSE}/exchangeReport/BWIBBU_ALL`;
export function numeric(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).replaceAll(",", "").trim();
  if (!text || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(text)) return null;
  const n = Number(text); return Number.isFinite(n) ? n : null;
}
export function rocDate(value: string | undefined): string | null {
  const text = value?.replaceAll("/", "");
  if (!text || !/^\d{7}$/.test(text)) return null;
  const date = `${Number(text.slice(0, 3)) + 1911}-${text.slice(3, 5)}-${text.slice(5)}`;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}
export function parseTaiwanIncome(row: Row, otc = false): OfficialFinancials {
  const year = Number(row["年度"] ?? row.Year) + 1911;
  const quarter = Number(row["季別"] ?? row.Season);
  if (!Number.isInteger(year) || year < 2000 || ![1, 2, 3, 4].includes(quarter)) throw new Error("官方財報期間無效");
  const end = new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10);
  if (end > new Date().toISOString().slice(0, 10)) throw new Error("官方財報期間在未來，不採用");
  const sourceUrl = otc ? OTC_INCOME : TW_INCOME;
  const money = (key: string) => { const n = numeric(row[key]); return n == null ? null : n * 1000; };
  return { provider: otc ? "TPEx" : "TWSE", currency: "TWD", unit: "新台幣元；來源千元已乘 1,000，EPS 維持元/股",
    status: "available", latestPeriod: end, publishedOn: null, sourceUrl,
    notes: [
      `來源出表日：${rocDate(row["出表日期"] ?? row.Date) ?? "未提供"}；出表日不是公司公告日。`,
      `本表為 ${year} 年第 ${quarter} 季年初至今累計，非單季、非近四季；不將累計 EPS 年化。`,
      "目前僅接入一般業最新損益表。現金流、歷年資料與金融業專用報表尚未完整接入，暫不據此產生合理價。",
    ],
    years: [{ start: `${year}-01-01`, end, filed: "", revenue: money("營業收入"),
      netIncome: money("本期淨利（淨損）"), eps: numeric(row["基本每股盈餘（元）"]),
      operatingCashflow: null, capex: null, freeCashflow: null, sourceUrl }],
  };
}
export async function getTaiwanFinancials(symbol: string, otc?: boolean): Promise<OfficialFinancials> {
  const sources = otc === true ? [OTC_INCOME] : otc === false ? [TW_INCOME] : [TW_INCOME, OTC_INCOME];
  const results = await Promise.allSettled(sources.map(url => sourceJson<Row[]>(url)));
  for (let i = 0; i < results.length; i++) {
    const r = results[i]; if (r.status !== "fulfilled") continue;
    if (!Array.isArray(r.value)) continue;
    const row = r.value.find(row => (row["公司代號"] ?? row.SecuritiesCompanyCode) === symbol);
    if (row) return parseTaiwanIncome(row, sources[i] === OTC_INCOME);
  }
  throw new Error(results.every(r => r.status === "rejected") ? "官方損益資料來源連線失敗" : "一般業資料未包含此公司；可能需其他產業專用報表");
}

// Taiwan analysis must remain usable when the third-party quote service fails.
export async function getTaiwanReport(query: string): Promise<import('@/types/stock').StockResearchReport | null> {
  const key = query.replace(/\.(TW|TWO)$/i, '').trim();
  const sources = query.toUpperCase().endsWith('.TWO') ? [`${TPEX}/tpex_mainboard_quotes`] : query.toUpperCase().endsWith('.TW') ? [TW_QUOTES] : [TW_QUOTES, `${TPEX}/tpex_mainboard_quotes`];
  const results = await Promise.allSettled(sources.map(url => sourceJson<Row[]>(url, 300000)));
  for (let i=0; i<results.length; i++) {
    const result=results[i]; if(result.status!=='fulfilled' || !Array.isArray(result.value)) continue;
    const otc=sources[i]!==TW_QUOTES;
    const q=result.value.find(r => (otc?r.SecuritiesCompanyCode:r.Code)===key || (otc?r.CompanyName:r.Name)===key);
    if(!q) continue;
    const symbol=otc?q.SecuritiesCompanyCode:q.Code;
    if(!/^\d{4}$/.test(symbol) || symbol.startsWith('00')) continue;
    const price=numeric(otc?q.Close:q.ClosingPrice); if(price==null || price<=0) continue;
    const change=numeric(q.Change); const previous=change==null?null:price-change;
    const report: import('@/types/stock').StockResearchReport = {
      symbol,name:otc?q.CompanyName:q.Name,market:'TW',currency:'TWD',price,
      change:change??0,changePercent:previous!=null && previous>0?change!/previous*100:0,
      changeAvailable:change!=null && previous!=null && previous>0,
      quoteSource:otc?'TPEx':'TWSE',quoteDate:rocDate(q.Date),quoteAsOf:null,
      industry:null,financialCurrency:'TWD',sourceUrl:sources[i],officialSourceUrl:'https://mops.twse.com.tw/',
      valuationStatus:'unverified',valuationReasons:['官方收盤行情與累計財報分開呈現；資料不足時不產生合理價。','護城河、管理層與關鍵人物尚未完成有來源的研究，不評分。'],
      financialProfile:{roe:null,roa:null,grossMargin:null,operatingMargin:null,debtToEquity:null,eps:null,growthRate:null,pe:null,pb:null,marketCap:null},
    };
    try { report.official=await getTaiwanFinancials(symbol,otc); } catch(error) { report.officialError=error instanceof Error?error.message:'官方財報取得失敗'; }
    return report;
  }
  return null;
}
