import assert from "node:assert/strict";
import {
  yahooVipPbBand,
  yahooVipPeBand,
  yahooVipDividendBand,
  classicTaiwan,
} from "../src/lib/research/classic.ts";
import { calculateEntry } from "../src/lib/research/pricing.ts";
import { getDatedEvidence } from "../src/lib/research/enrich.ts";
import { sourceJson } from "../src/lib/research/official.ts";
import { TW_QUOTES, TW_RATIOS, numeric, rocDate } from "../src/lib/research/taiwan.ts";

console.log("=== Unit: Yahoo VIP bands ===");
const pb = yahooVipPbBand(20, [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, ...Array.from({length:20},(_,i)=>0.5+i*0.05)]);
assert.ok(pb);
assert.ok(pb.cheap < pb.fair && pb.fair < pb.expensive);
assert.ok(pb.expensive <= 20 * 1.4 + 0.01);
console.log("PB band", pb);

const pe = yahooVipPeBand(5, [
  ...[2021,2022,2023,2024,2025].flatMap((y) => [
    { year: y, pe: 8 },
    { year: y, pe: 12 },
    { year: y, pe: 18 },
    { year: y, pe: 200 }, // must be ignored
  ]),
]);
assert.ok(pe);
assert.ok(pe.fair < 5 * 40, "extreme PE samples must not dominate");
console.log("PE band", pe);

const div = yahooVipDividendBand(1);
assert.equal(div.cheap, 20);
assert.equal(div.fair, 25);
assert.equal(div.expensive, 1 / 0.03);
console.log("Dividend band OK");

console.log("\n=== Live: 和成 1810 / 十銓 4967 ===");
const [quotes, ratios] = await Promise.all([
  sourceJson(TW_QUOTES, 300000),
  sourceJson(TW_RATIOS, 300000),
]);

async function checkTw(symbol, name, maxFairMultiple = 2.5) {
  const q = quotes.find((r) => r.Code === symbol);
  const r = ratios.find((row) => row.Code === symbol);
  assert.ok(q && r, `${symbol} missing from TWSE`);
  const price = numeric(q.ClosingPrice);
  const asOf = rocDate(q.Date);
  const { evidence, summary } = await getDatedEvidence(`${symbol}.TW`);
  const base = calculateEntry(evidence, {
    price,
    currency: "TWD",
    asOf,
    sector: summary?.assetProfile?.sector ?? "Unknown",
    marketCap: summary?.price?.marketCap ?? price * 1e9,
    shares: summary?.defaultKeyStatistics?.sharesOutstanding ?? null,
  });
  const valued = await classicTaiwan(
    symbol,
    price,
    asOf,
    base,
    summary?.assetProfile?.industry ?? null
  );
  console.log(
    JSON.stringify(
      {
        name,
        symbol,
        price,
        currency: "TWD",
        method: valued.method,
        fair: valued.fair,
        entry: valued.entry,
        high: valued.high,
        margin: valued.margin,
        status: valued.status,
        signal: valued.signal,
        models: valued.models?.map((m) => ({
          name: m.name,
          fair: m.fair,
          low: m.low,
          high: m.high,
        })),
      },
      null,
      2
    )
  );
  if (valued.fair != null) {
    assert.ok(
      valued.fair <= price * maxFairMultiple + 0.01,
      `${name} fair ${valued.fair} > ${maxFairMultiple}x price ${price}`
    );
    assert.ok(valued.fair > 0);
    assert.ok(valued.entry == null || valued.entry <= valued.fair + 0.01);
  }
}

await checkTw("1810", "和成");
await checkTw("4967", "十銓");

console.log("\nAll valuation sanity checks passed.");
