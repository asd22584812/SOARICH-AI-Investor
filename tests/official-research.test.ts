import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSecFinancials, type SecFacts, type SecFact } from '../src/lib/research/official';
import { parseTaiwanIncome, numeric, rocDate } from '../src/lib/research/taiwan';
import { parseTwRadar, parseUsRadar } from '../src/lib/research/radar';
import { calculateScenarios, discountCashflow } from '../src/lib/research/scenarios';
const now = Date.parse('2026-10-15T12:00:00Z');
const fact = (val: number, extra: Partial<SecFact> = {}): SecFact => ({start:'2025-01-01',end:'2025-12-31',filed:'2026-02-01',accn:'0000000001-26-000001',form:'10-K',val,...extra});
function data(): SecFacts { return {cik:1,entityName:'Test fixture only',facts:{'us-gaap':{
  Revenues:{units:{USD:[fact(100),fact(110,{filed:'2026-03-01'}),fact(999,{filed:'2027-01-01'}),fact(50,{start:'2025-07-01'})]}},
  NetCashProvidedByUsedInOperatingActivities:{units:{USD:[fact(30)]}},
  PaymentsToAcquirePropertyPlantAndEquipment:{units:{USD:[fact(10,{start:'2025-07-01'})]}}
}}}; }
test('SEC exact annual periods exclude YTD, future filings and use latest revisions',()=>{
 const r=parseSecFinancials(data(),false,'2026-10-15'); assert.equal(r.years.length,1);assert.equal(r.years[0].revenue,110); assert.equal(r.years[0].freeCashflow,null);
 const d=data(); d.facts['us-gaap'].PaymentsToAcquirePropertyPlantAndEquipment.units.USD=[fact(10)];assert.equal(parseSecFinancials(d,false,'2026-10-15').years[0].freeCashflow,20);
});
test('Taiwan reports preserve cumulative period, thousand-dollar units, negative EPS and missing cashflow',()=>{
 const r=parseTaiwanIncome({'年度':'115','季別':'2','營業收入':'1,000','本期淨利（淨損）':'0','基本每股盈餘（元）':'-2.5'});
 assert.equal(r.years[0].revenue,1000000);assert.equal(r.years[0].eps,-2.5);assert.equal(r.years[0].netIncome,0);assert.equal(r.years[0].end,'2026-06-30');assert.equal(r.years[0].freeCashflow,null);assert.equal(r.publishedOn,null);
 assert.equal(numeric('--'),null);assert.equal(numeric(''),null);assert.equal(rocDate('1150230'),null);
 assert.equal(calculateScenarios(r,{currency:'TWD',classification:'growth',quoteAsOf:'2026-10-15'},new Date(now)).status,'unavailable');
});
test('Taiwan radar requires same-date real quotes, positive PE, liquidity and freshness',()=>{
 const q={Code:'9999',Name:'Test fixture',Date:'1151014',ClosingPrice:'20',TradeValue:'10000001'};
 const r={Code:'9999',Date:'1151014',PEratio:'10'};
 assert.equal(parseTwRadar([q],[r],now).candidates.length,1);
 for(const bad of [{...r,Date:'1151013'},{...r,PEratio:'-2'},{...r,PEratio:'--'}]) assert.equal(parseTwRadar([q],[bad],now).candidates.length,0);
 assert.equal(parseTwRadar([q],[r],now+8*86400000).candidates.length,0);
});
test('Yahoo extra schema fields do not erase candidates; invalid currency or stale prices are excluded',()=>{
 const q={symbol:'TEST',quoteType:'EQUITY',currency:'USD',regularMarketPrice:10,trailingPE:12,regularMarketTime:now/1000,fulldayPrice:10};
 assert.equal(parseUsRadar({quotes:[q,q,{...q,symbol:'BAD',currency:'TWD'}]},now).candidates.length,1);
 assert.equal(parseUsRadar({quotes:[{...q,regularMarketTime:0}]},now).candidates.length,0);
 assert.throws(()=>parseUsRadar({error:'blocked'}));
});
test('DCF equation is independent of observed price and rejects invalid discount rates',()=>{
 assert.ok(Math.abs(discountCashflow(100,10,0,.1,0)-100)<1e-8);
 assert.throws(()=>discountCashflow(100,10,0,.02,.03));
});
test('scenario gate rejects malformed dates and multiple listings even with five positive annual cashflows',()=>{
 const r=parseSecFinancials(data(),false,'2026-10-15');
 r.years=Array.from({length:5},(_,i)=>({...r.years[0],start:`${2021+i}-01-01`,end:`${2021+i}-12-31`,freeCashflow:100}));
 r.latestPeriod='2026-06-30';r.shares={value:10,asOf:'2026-07-01',sourceUrl:r.sourceUrl};
 const input={currency:'USD',classification:'growth',quoteAsOf:'2026-10-15'};
 assert.equal(calculateScenarios(r,input,new Date(now)).status,'available');
 assert.equal(calculateScenarios(r,{...input,quoteAsOf:'bad'},new Date(now)).status,'unavailable');
 r.multipleListings=true;assert.equal(calculateScenarios(r,input,new Date(now)).status,'unavailable');
});
