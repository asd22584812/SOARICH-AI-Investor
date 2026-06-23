import { runMarketScan } from "../src/lib/scanner/scanner.ts";

function readArg(name) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match?.split("=")[1];
}

const market = readArg("market") === "US" ? "US" : "TW";
const limitRaw = readArg("limit");
const limit = limitRaw ? Number(limitRaw) : undefined;
const concurrency = Number(readArg("concurrency") ?? "2");
const delayMs = Number(readArg("delay") ?? "300");

console.log(`Starting ${market} market scan...`);
if (limit) console.log(`Limit: ${limit} symbols`);

const started = Date.now();
const result = await runMarketScan(market, {
  limit,
  concurrency,
  delayMs,
  clearExisting: true,
});

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  JSON.stringify(
    {
      market,
      runId: result.runId,
      processed: result.processed,
      total: result.total,
      elapsedSeconds: elapsed,
    },
    null,
    2
  )
);
