import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalMultiple} from '../src/lib/research/classic';
test('historical multiple requires 24 positive observations and computes even median correctly',()=>{
 assert.equal(historicalMultiple(Array(23).fill(10)),null);
 assert.equal(historicalMultiple([...Array(12).fill(10),...Array(12).fill(20)]),15);
 assert.equal(historicalMultiple([...Array(24).fill(10),null,0,-2,NaN]),10);
});
