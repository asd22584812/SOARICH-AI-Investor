import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeRadar} from '../src/lib/research/merge-radar';
import type {ResearchRadar,ResearchCandidate} from '../src/lib/research/radar';
const stock=(symbol:string):ResearchCandidate=>({symbol,name:symbol,market:'US',currency:'USD',price:1,pe:1,asOf:'2026-10-19',reason:'test',sourceUrl:'https://example.test',margin:30});
const page=(symbols:string[],excluded:string[]=[]):ResearchRadar=>({candidates:symbols.map(stock),excluded:excluded.map(symbol=>({symbol,reason:'missing'})),description:'',coverage:'',sourceDate:'2026-10-19',nextCursor:12});
test('later batches retain earlier matches and retries do not duplicate them',()=>{
 const first=page(['A']);const result=mergeRadar(first,page(['B']));assert.deepEqual(result.candidates.map(x=>x.symbol),['A','B']);assert.equal(mergeRadar(result,page(['B'])).candidates.length,2);assert.equal(first.candidates.length,1);
});
test('new evidence replaces stale accepted/excluded status by symbol',()=>{
 const result=mergeRadar(page(['A'],['B']),page(['B'],['A']));assert.deepEqual(result.candidates.map(x=>x.symbol),['B']);assert.deepEqual(result.excluded?.map(x=>x.symbol),['A']);
});
