import { fetchStatementSeries, fetchYahooSummary } from '../stock/yahoo';
import { calculateEntry, parseStatementRows, type PricingEvidence } from './pricing';
import { sourceJson } from './official';
import { TWSE, TPEX, type Row } from './taiwan';
import type { StockResearchReport } from '@/types/stock';
const cache=new Map<string,{until:number;promise:ReturnType<typeof load>}>();
async function load(symbol:string){
  const [annual,quarterly,summary]=await Promise.allSettled([fetchStatementSeries(symbol,'annual'),fetchStatementSeries(symbol,'quarterly'),fetchYahooSummary(symbol)]);
  const raw=summary.status==='fulfilled'?summary.value:null;
  const evidence:PricingEvidence={provider:'Yahoo Finance',currency:raw?.financialData?.financialCurrency??null,sourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/financials/`,annual:parseStatementRows(annual.status==='fulfilled'?annual.value:[],12),quarterly:parseStatementRows(quarterly.status==='fulfilled'?quarterly.value:[],3),warnings:['歷年明細由 Yahoo Finance 提供，不冒充 SEC 原始申報；欄位保留期間與缺值。']};
  if(annual.status==='rejected')evidence.warnings.push('年度明細讀取失敗。');
  if(quarterly.status==='rejected')evidence.warnings.push('季度明細讀取失敗。');
  return {evidence,summary:raw};
}
export async function getDatedEvidence(symbol:string){
  const hit=cache.get(symbol);if(hit && hit.until>Date.now())return hit.promise;
  const promise=load(symbol);if(cache.size>=100)cache.delete(cache.keys().next().value!);
  cache.set(symbol,{until:Date.now()+900000,promise});
  const value=await promise;
  if(!value.evidence.annual.length || !value.evidence.quarterly.length)cache.delete(symbol);
  return value;
}
export async function enrichResearch(report:StockResearchReport,yahooSymbol:string){
  const {evidence,summary}=await getDatedEvidence(yahooSymbol);
  report.statements=evidence;
  const p=summary?.assetProfile;
  if(p)report.company={description:p.longBusinessSummary??null,sector:p.sector??null,industry:p.industry??null,website:p.website??null,people:(p.companyOfficers??[]).slice(0,4).map(o=>({name:o.name,title:o.title})),descriptionSourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}/profile/`,sourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}/profile/`,asOf:null};
  report.entryValuation=calculateEntry(evidence,{price:report.price,currency:report.currency,asOf:report.quoteDate??report.quoteAsOf??null,sector:p?.sector??null,marketCap:summary?.price?.marketCap??report.financialProfile.marketCap,shares:summary?.defaultKeyStatistics?.sharesOutstanding??null});
  if(report.market==='TW' && report.official?.currency===evidence.currency){
    const official=report.official.years.at(-1);
    const quarters=official?evidence.quarterly.filter(q=>q.end>=official.start && q.end<=official.end):[];
    const count=official?Number(official.end.slice(5,7))/3:0;
    if(official?.revenue!=null && count===quarters.length && quarters.every(q=>q.revenue!=null)){
      const total=quarters.reduce((n,q)=>n+q.revenue!,0);
      if(Math.abs(total-official.revenue)>Math.max(1,Math.abs(official.revenue)*.02)){
        report.entryValuation={...report.entryValuation,status:'unavailable',eligible:false,signal:'來源數字待核對',fair:null,entry:null,low:null,high:null,margin:null,reasons:['Yahoo 單季營收加總與交易所同期累計差異超過 2%，暫停價格判斷。']};
      }else evidence.warnings.push('同期間單季營收加總已與交易所累計營收比對，差異不超過 2%；此核對不代表其他欄位均已驗證。');
    }
  }
  report.valuationReasons=report.entryValuation.status==='available'?['估值使用下方列明期間的財報；公式、報酬率假設及安全邊際可逐項核對。']:report.entryValuation.reasons;
  return report;
}
export async function enrichTaiwanCompany(report:StockResearchReport,otc:boolean){
  const url=otc?`${TPEX}/mopsfin_t187ap03_O`:`${TWSE}/opendata/t187ap03_L`;
  try{
    const rows=await sourceJson<Row[]>(url);const r=rows.find(r=>(r['公司代號']??r.SecuritiesCompanyCode)===report.symbol);
    if(!r)return;
    report.company={...report.company,description:report.company?.description??null,sector:report.company?.sector??null,industry:report.company?.industry??r['產業別']??null,website:r['網址']??report.company?.website??null,people:[{name:r['董事長']??'',title:'董事長'},{name:r['總經理']??'',title:'總經理'}].filter(p=>p.name),sourceUrl:url,asOf:r['出表日期']??r.Date??null};
  }catch{/* Company source outage does not erase valid financial statements. */}
}
