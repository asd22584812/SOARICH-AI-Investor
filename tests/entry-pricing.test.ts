import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsValue,calculateEntry,parseStatementRows,type PricingEvidence,type StatementRow} from '../src/lib/research/pricing';
const now=Date.parse('2026-10-19');
const row=(end:string,months:3|12):StatementRow=>({end,months,revenue:400,income:100,eps:1,ocf:100,capex:20,fcf:80,grossProfit:200,operatingIncome:150,equity:500,assets:800,debt:100,shares:100});
const evidence=():PricingEvidence=>({provider:'Yahoo Finance',currency:'USD',sourceUrl:'https://example.test',warnings:[],annual:['2023-12-31','2024-12-31','2025-12-31'].map(d=>row(d,12)),quarterly:['2025-06-30','2025-09-30','2025-12-31','2026-03-31','2026-06-30'].map(d=>row(d,3))});
const input={price:5,currency:'USD',asOf:'2026-10-16',sector:'Technology',marketCap:500,shares:100};
test('earnings valuation is independent of price and has ordered scenarios',()=>{
 const v=calculateEntry(evidence(),input,now);assert.ok(v.fair!>0);assert.ok(v.low!<=v.fair! && v.high!>=v.fair!);assert.equal(v.entry,Math.min(v.low!,v.fair!*.8));assert.equal(v.eligible,true);
 const expensive=calculateEntry(evidence(),{...input,price:100,marketCap:10000},now);assert.equal(expensive.fair,v.fair);assert.equal(expensive.eligible,false);assert.equal(expensive.margin,(v.fair!-100)/v.fair!*100);
});
test('currency, stale dates, discontinuous periods, share mismatch and missing cap block valuation',()=>{
 for(const patch of [{currency:'TWD'},{asOf:'2026-09-01'},{marketCap:100},{marketCap:null}])assert.equal(calculateEntry(evidence(),{...input,...patch},now).status,'unavailable');
 const e=evidence();e.quarterly.splice(2,1);assert.equal(calculateEntry(e,input,now).status,'unavailable');
});
test('missing or negative cashflow is never filled; financial firms use separate earnings method',()=>{
 const e=evidence();e.annual[0].fcf=null;assert.equal(calculateEntry(e,input,now).status,'unavailable');
 const bank=calculateEntry(e,{...input,sector:'Financial Services'},now);assert.ok(bank.fair!>0);assert.equal(bank.normalizedFcfPerShare,null);
 assert.equal(calculateEntry(e,{...input,sector:'Real Estate'},now).status,'unavailable');
});
test('FCF parsing preserves zero, rejects positive expense and inconsistent supplied FCF',()=>{
 const raw={date:'2025-12-31',periodType:'12M',operatingCashFlow:50,capitalExpenditure:-20,freeCashFlow:30};
 assert.equal(parseStatementRows([raw],12,now)[0].fcf,30);
 assert.equal(parseStatementRows([{...raw,capitalExpenditure:20}],12,now)[0].fcf,null);
 assert.equal(parseStatementRows([{...raw,freeCashFlow:45}],12,now)[0].fcf,null);
 assert.equal(parseStatementRows([{...raw,operatingCashFlow:0,capitalExpenditure:0,freeCashFlow:0}],12,now)[0].fcf,0);
 assert.equal(parseStatementRows([{...raw,periodType:'6M'}],3,now).length,0);
});
test('basic and diluted EPS cannot be silently mixed in a TTM sum',()=>{
 const e=evidence();e.quarterly.forEach(q=>q.epsBasis='diluted');e.quarterly.at(-1)!.epsBasis='basic';
 const value=calculateEntry(e,input,now);assert.equal(value.metrics.find(m=>m.label.startsWith('TTM EPS'))?.value,null);
 assert.ok(value.fair!>0);
});

test('discount formula agrees with perpetual zero-growth cash distribution when ROE equals required return',()=>{
 assert.ok(Math.abs(earningsValue(5,.10,0,.10,0)-50)<1e-10);
 assert.ok(Number.isNaN(earningsValue(5,.1,.2,.1)));
 assert.ok(earningsValue(5,.2,.08,.08)>earningsValue(5,.2,.08,.12));
});
test('TWD and USD calculations preserve native monetary scale without exchange conversions',()=>{
 const us=calculateEntry(evidence(),input,now);const tw=evidence();tw.currency='TWD';
 const v=calculateEntry(tw,{...input,currency:'TWD'},now);assert.equal(v.fair,us.fair);
 assert.equal(v.guide?.find(x=>x.label.includes('P/E'))?.price,48);
 assert.equal(v.guide?.find(x=>x.label.includes('P/B'))?.price,4);
 assert.equal(v.guide?.find(x=>x.label.includes('十年'))?.result,'未驗證');
});
