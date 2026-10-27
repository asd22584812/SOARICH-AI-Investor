import { sourceJson } from "./official";
import { TW_QUOTES, TW_RATIOS, numeric, rocDate, type Row } from "./taiwan";
import { fetchDynamicUsCandidates } from "../stock/yahoo";
export interface ResearchCandidate {
  symbol: string; name: string; market: "TW" | "US"; price: number; currency: "TWD" | "USD";
  entry?:number; fair?:number; margin?:number; pe: number; asOf: string | null; reason: string; sourceUrl: string;
}
export interface ResearchRadar { nextCursor?:number|null; excluded?: {symbol:string;reason:string}[]; candidates: ResearchCandidate[]; description: string; coverage: string; sourceDate: string | null; }
const isFreshDate = (d: string | null, now: number) => d != null && Number.isFinite(Date.parse(d)) && now-Date.parse(d) <= 7*86400000 && now-Date.parse(d) >= -86400000;
export function parseTwRadar(quotes: Row[], ratios: Row[], now = Date.now(), offset=0): ResearchRadar {
  const byCode = new Map(ratios.map(r => [r.Code, r]));
  const candidates = quotes.flatMap((q): ResearchCandidate[] => {
    const r = byCode.get(q.Code); const price = numeric(q.ClosingPrice); const pe = numeric(r?.PEratio);
    const volumeValue = numeric(q.TradeValue); const date = rocDate(q.Date);
    if (!/^\d{4}$/.test(q.Code) || q.Code.startsWith("00") || !r || q.Date !== r.Date || !isFreshDate(date, now) || price == null || price <= 0 || pe == null || pe <= 0 || pe > 15 || volumeValue == null || volumeValue < 10000000) return [];
    return [{ symbol: q.Code, name: q.Name, market: "TW", price, currency: "TWD", pe, asOf: date,
      reason: `交易所本益比 ${pe.toFixed(2)} 倍；當日成交金額至少新台幣 1,000 萬元。尚未證實低於內在價值。`, sourceUrl: TW_RATIOS }];
  }).sort((a,b) => a.pe-b.pe || a.symbol.localeCompare(b.symbol));
  return { nextCursor:offset+12<candidates.length?offset+12:null, candidates:candidates.slice(offset,offset+12), description: "上市低本益比研究候選：本益比介於 0～15 倍且成交金額達門檻。這是初篩，不是合理價或買入推薦。", coverage: `本次取得 ${quotes.length} 筆上市行情；尚未涵蓋上櫃，資料超過七日或行情與比率日期不同會排除。`, sourceDate: rocDate(quotes[0]?.Date) };
}
export function parseUsRadar(raw: unknown, now = Date.now(), offset=0): ResearchRadar {
  if (!raw || typeof raw !== "object" || !("quotes" in raw) || !Array.isArray(raw.quotes)) throw new Error("Yahoo 篩選回應缺少股票陣列");
  const seen = new Set<string>();
  const candidates = raw.quotes.flatMap((row: unknown): ResearchCandidate[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const symbol = typeof r.symbol === "string" ? r.symbol.toUpperCase() : "";
    const price = numeric(r.regularMarketPrice);
    // PE 可缺：後續可用課程 PB／股息法；不要因缺 PE 整批清空
    const pe = numeric(r.trailingPE) ?? 0;
    const time = r.regularMarketTime instanceof Date ? r.regularMarketTime.getTime() : typeof r.regularMarketTime === "number" ? r.regularMarketTime * 1000 : NaN;
    const date = Number.isFinite(time) ? new Date(time).toISOString() : null;
    if (r.quoteType !== "EQUITY" || r.currency !== "USD" || !/^[A-Z]{1,5}(?:[.-][A-Z])?$/.test(symbol) || seen.has(symbol) || price == null || price <= 0 || !isFreshDate(date, now)) return [];
    seen.add(symbol);
    return [{ symbol, name: String(r.shortName ?? r.longName ?? symbol), market: "US", price, currency: "USD", pe: pe > 0 ? pe : 0, asOf: date,
      reason: "Yahoo 多篩選器動態初篩（大型低估／成長／熱門）；需再核對合理價與公司風險。", sourceUrl: "https://finance.yahoo.com/research-hub/screener/undervalued_large_caps/" }];
  });
  return {
    nextCursor: offset + 12 < candidates.length ? offset + 12 : null,
    candidates: candidates.slice(offset, offset + 12),
    description: "美股動態研究候選：合併 Yahoo 多個篩選器，優先 USD 美股交易所標的，再以估值／課程門檻核對。",
    coverage: `本次合併初篩 ${candidates.length + offset > candidates.length ? "見來源池" : candidates.length} 檔以上；每批評估 12 檔。非固定名單。`,
    sourceDate: candidates[0]?.asOf ?? null,
  };
}
export async function getResearchRadar(market: "TW" | "US", offset=0): Promise<ResearchRadar> {
  if (market === "US") return parseUsRadar(await fetchDynamicUsCandidates(),Date.now(),offset);
  const [quotes, ratios] = await Promise.all([sourceJson<Row[]>(TW_QUOTES,300000), sourceJson<Row[]>(TW_RATIOS,300000)]);
  if (!Array.isArray(quotes) || !Array.isArray(ratios)) throw new Error("交易所資料格式不符");
  return parseTwRadar(quotes,ratios,Date.now(),offset);
}

/** Dynamic discovery is only a first stage; never publish PE-only candidates as entry signals. */
export async function getEntryRadar(market: 'TW'|'US',offset=0): Promise<ResearchRadar> {
  const radar=await getResearchRadar(market,offset);
  const {getDatedEvidence}=await import('./enrich');
  const {calculateEntry}=await import('./pricing');
  let unavailable=0, aboveEntry=0;
  const excluded:{symbol:string;reason:string}[]=[];
  const results=await Promise.all(radar.candidates.map(async candidate=>{
    try{
      const yahooSymbol=candidate.symbol+(market==='TW'?'.TW':'');
      const {evidence,summary}=await getDatedEvidence(yahooSymbol);
      const sector=summary?.assetProfile?.sector??null;
      let value=calculateEntry(evidence,{price:candidate.price,currency:candidate.currency,asOf:candidate.asOf,sector,marketCap:summary?.price?.marketCap??null,shares:summary?.defaultKeyStatistics?.sharesOutstanding??null});
      if(market==='TW'){
        const {classicTaiwan}=await import('./classic');
        value=await classicTaiwan(candidate.symbol,candidate.price,candidate.asOf,value,summary?.assetProfile?.industry??sector);
      } else if (value.status!=='available' || !value.eligible) {
        // 美股：盈餘折現常因 ADR 幣別／負 FCF 全滅 → 改用課程門檻（USD 報價欄位）
        const {classicUs, quoteMetricsFromSummary}=await import('./classic-us');
        const course=classicUs(
          {price:candidate.price,currency:candidate.currency,asOf:candidate.asOf,name:candidate.name,sector:sector??'Unknown'},
          quoteMetricsFromSummary(summary)
        );
        if(course.status==='available') value=course;
      }
      if(value.status!=='available'){unavailable++;excluded.push({symbol:candidate.symbol,reason:value.reasons.join(' ')});return null;}
      if(!value.eligible){aboveEntry++;excluded.push({symbol:candidate.symbol,reason:value.signal});return null;}
      return {...candidate,entry:value.entry!,fair:value.fair!,margin:value.margin!,pe:candidate.pe||0,reason:`現價低於所列估值與保守買點。${value.method}。需再核對個別公司風險。`};
    }catch{unavailable++;excluded.push({symbol:candidate.symbol,reason:"財報來源讀取失敗，可稍後重新核對。"});return null;}
  }));
  const candidates=results.filter((x):x is NonNullable<typeof x>=>x!=null).sort((a,b)=>b.margin-a.margin);
  return {...radar,candidates,excluded,description:'價格篩選候選：台股採 Yahoo VIP 歷史區間；美股採盈餘折現，失敗則改用課程 PE12／PB0.8／股息門檻。通過價格條件不等於完成公司風險審查。',coverage:radar.coverage+` 本批從初篩第 ${offset+1} 檔起評估 ${radar.candidates.length} 檔；符合 ${candidates.length} 檔，未達價格 ${aboveEntry} 檔，資料不足 ${unavailable} 檔。`};
}
