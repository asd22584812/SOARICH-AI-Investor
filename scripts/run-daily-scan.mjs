import { runMarketScan } from "../src/lib/scanner/scanner.ts";

const delayMs = Number(process.env.SCAN_DELAY_MS ?? "300");
const concurrency = Number(process.env.SCAN_CONCURRENCY ?? "2");
const limit = process.env.SCAN_LIMIT ? Number(process.env.SCAN_LIMIT) : undefined;

console.log("SOARICH daily market scan started", new Date().toISOString());

for (const market of ["TW", "US"]) {
  console.log(`\n=== Scanning ${market} ===`);
  try {
  const result = await runMarketScan(market, {
    limit,
    delayMs,
    concurrency,
    clearExisting: true,
  });
  console.log(JSON.stringify({ market, ...result }));
  if (result.failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error(market, error.message);
    process.exitCode = 1;
  }
}

console.log("\nDaily scan completed", new Date().toISOString());
