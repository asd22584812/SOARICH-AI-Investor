import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateEntry,parseStatementRows,type PricingEvidence,type StatementRow} from '../src/lib/research/pricing';
const now=Date.parse('2026-10-19');
const row=(end:string,months:3|12):StatementRow=>({end,months,revenue:400,income:100,eps:1,ocf:100,capex:20,fcf:80,grossProfit:200,operatingIncome:150,equity:500,assets:800,debt:100,shares:100});
const evidence=():PricingEvidence=>({provider:'Yahoo Finance',currency:'USD',sourceUrl:'https://example.test',warnings:[],annual:['2023-12-31','2024-12-31','2025-12-31'].map(d=>row(d,12)),quarterly:['2025-06-30','2025-09-30','2025-12-31','2026-03-31','2026-06-30'].map(d=>row(d,3))});
const input={price:5,currency:'USD',asOf:'2026-10-16',sector:'Technology',marketCap:500,shares:100};
test('capitalization is computed from normalized cash flows, not observed price',()=>{
 const v=calculateEntry(evidence(),input,now);assert.equal(v.fair,8);assert.equal(v.entry,6.4);assert.equal(v.eligible,true);
 const expensive=calculateEntry(evidence(),{...input,price:10,marketCap:1000},now);assert.equal(expensive.fair,8);assert.equal(expensive.eligible,false);assert.equal(expensive.margin,-25);
});
test('currency, stale dates, discontinuous periods, share mismatch and missing cap block valuation',()=>{
 for(const patch of [{currency:'TWD'},{asOf:'2026-09-01'},{marketCap:100},{marketCap:null}])assert.equal(calculateEntry(evidence(),{...input,...patch},now).status,'unavailable');
 const e=evidence();e.quarterly.splice(2,1);assert.equal(calculateEntry(e,input,now).status,'unavailable');
});
test('missing or negative cashflow is never filled; financial firms use separate earnings method',()=>{
 const e=evidence();e.annual[0].fcf=null;assert.equal(calculateEntry(e,input,now).status,'unavailable');
 const bank=calculateEntry(e,{...input,sector:'Financial Services'},now);assert.equal(bank.fair,10);assert.equal(bank.normalizedFcfPerShare,null);
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
 assert.equal(value.fair,8);
});
