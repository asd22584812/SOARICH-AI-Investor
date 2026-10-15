import { sourceJson } from "./official";
import { TW_QUOTES, TW_RATIOS, numeric, rocDate, type Row } from "./taiwan";
import { fetchDynamicUsCandidates } from "../stock/yahoo";
export interface ResearchCandidate {
  symbol: string; name: string; market: "TW" | "US"; price: number; currency: "TWD" | "USD";
  pe: number; asOf: string | null; reason: string; sourceUrl: string;
}
export interface ResearchRadar { candidates: ResearchCandidate[]; description: string; coverage: string; sourceDate: string | null; }
const isFreshDate = (d: string | null, now: number) => d != null && Number.isFinite(Date.parse(d)) && now-Date.parse(d) <= 7*86400000 && now-Date.parse(d) >= -86400000;
export function parseTwRadar(quotes: Row[], ratios: Row[], now = Date.now()): ResearchRadar {
  const byCode = new Map(ratios.map(r => [r.Code, r]));
  const candidates = quotes.flatMap((q): ResearchCandidate[] => {
    const r = byCode.get(q.Code); const price = numeric(q.ClosingPrice); const pe = numeric(r?.PEratio);
    const volumeValue = numeric(q.TradeValue); const date = rocDate(q.Date);
    if (!/^\d{4}$/.test(q.Code) || q.Code.startsWith("00") || !r || q.Date !== r.Date || !isFreshDate(date, now) || price == null || price <= 0 || pe == null || pe <= 0 || pe > 15 || volumeValue == null || volumeValue < 10000000) return [];
    return [{ symbol: q.Code, name: q.Name, market: "TW", price, currency: "TWD", pe, asOf: date,
      reason: `交易所本益比 ${pe.toFixed(2)} 倍；當日成交金額至少新台幣 1,000 萬元。尚未證實低於內在價值。`, sourceUrl: TW_RATIOS }];
  }).sort((a,b) => a.pe-b.pe || a.symbol.localeCompare(b.symbol)).slice(0,12);
  return { candidates, description: "上市低本益比研究候選：本益比介於 0～15 倍且成交金額達門檻。這是初篩，不是合理價或買入推薦。", coverage: `本次取得 ${quotes.length} 筆上市行情；尚未涵蓋上櫃，資料超過七日或行情與比率日期不同會排除。`, sourceDate: rocDate(quotes[0]?.Date) };
}
export function parseUsRadar(raw: unknown, now = Date.now()): ResearchRadar {
  if (!raw || typeof raw !== "object" || !("quotes" in raw) || !Array.isArray(raw.quotes)) throw new Error("Yahoo 篩選回應缺少股票陣列");
  const seen = new Set<string>();
  const candidates = raw.quotes.flatMap((row: unknown): ResearchCandidate[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const symbol = typeof r.symbol === "string" ? r.symbol : "";
    const price = numeric(r.regularMarketPrice); const pe = numeric(r.trailingPE);
    const time = r.regularMarketTime instanceof Date ? r.regularMarketTime.getTime() : typeof r.regularMarketTime === "number" ? r.regularMarketTime * 1000 : NaN;
    const date = Number.isFinite(time) ? new Date(time).toISOString() : null;
    if (r.quoteType !== "EQUITY" || r.currency !== "USD" || !/^[A-Z]+(?:[.-][A-Z])?$/.test(symbol) || seen.has(symbol) || price == null || price <= 0 || pe == null || pe <= 0 || !isFreshDate(date, now)) return [];
    seen.add(symbol);
    return [{ symbol, name: String(r.shortName ?? r.longName ?? symbol), market: "US", price, currency: "USD", pe, asOf: date,
      reason: "Yahoo 動態大型價值股初篩；尚未完成此公司的官方財報與估值核對，不代表已確認低估。", sourceUrl: "https://finance.yahoo.com/research-hub/screener/undervalued_large_caps/" }];
  }).slice(0,12);
  return { candidates, description: "美股動態研究候選：來源為 Yahoo 大型價值股篩選器，再檢查幣別、價格、本益比與報價日期。", coverage: "只涵蓋來源本次回傳的最多 25 檔候選，非全美股掃描；未使用固定股票名單。", sourceDate: candidates[0]?.asOf ?? null };
}
export async function getResearchRadar(market: "TW" | "US"): Promise<ResearchRadar> {
  if (market === "US") return parseUsRadar(await fetchDynamicUsCandidates());
  const [quotes, ratios] = await Promise.all([sourceJson<Row[]>(TW_QUOTES,300000), sourceJson<Row[]>(TW_RATIOS,300000)]);
  if (!Array.isArray(quotes) || !Array.isArray(ratios)) throw new Error("交易所資料格式不符");
  return parseTwRadar(quotes,ratios);
}
