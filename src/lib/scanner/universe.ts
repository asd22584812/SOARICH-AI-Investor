import type { Market } from "@/types/stock";
import { getAllTaiwanStocks } from "@/lib/stock/twStockList";

export interface UniverseSymbol {
  query: string;
  market: Market;
  yahooSymbol?: string;
}

// Official current listings, not a hand-picked pool or a fallback constituent list.
export function parseNasdaqDirectory(text: string, symbolColumn: string): string[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split("|");
  for (const required of [symbolColumn, "ETF", "Test Issue", "Security Name"]) {
    if (!columns.includes(required)) throw new Error(`Invalid Nasdaq directory: ${required}`);
  }
  const get = (row: string[], key: string) => row[columns.indexOf(key)]?.trim();
  return lines.flatMap((line) => {
    const row = line.split("|");
    if (get(row, "Test Issue") !== "N" || get(row, "ETF") !== "N") return [];
    const symbol = get(row, symbolColumn);
    const name = get(row, "Security Name") ?? "";
    if (!symbol || !/^[A-Z]+(?:[.-][A-Z])?$/.test(symbol)) return [];
    if (/warrant|preferred|\bunits?\b|\bright(s)?\b|\bnote(s)?\b/i.test(name)) return [];
    return [symbol.replace(".", "-")];
  });
}

async function fetchDirectory(file: string, column: string): Promise<string[]> {
  const response = await fetch(`https://www.nasdaqtrader.com/dynamic/SymDir/${file}`, {
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Nasdaq directory failed: ${response.status}`);
  const symbols = parseNasdaqDirectory(await response.text(), column);
  if (!symbols.length) throw new Error("Nasdaq directory returned no equities");
  return symbols;
}

export async function getUsUniverse(): Promise<UniverseSymbol[]> {
  const [nasdaq, other] = await Promise.all([
    fetchDirectory("nasdaqlisted.txt", "Symbol"),
    fetchDirectory("otherlisted.txt", "ACT Symbol"),
  ]);
  return [...new Set([...nasdaq, ...other])].sort().map((query) => ({
    query, yahooSymbol: query, market: "US" as const,
  }));
}

export async function getTwUniverse(): Promise<UniverseSymbol[]> {
  return (await getAllTaiwanStocks()).map((stock) => ({
    query: stock.symbol, market: "TW" as const,
    yahooSymbol: `${stock.symbol}${stock.yahooSuffix}`,
  }));
}

export async function getMarketUniverse(market: Market): Promise<UniverseSymbol[]> {
  return market === "TW" ? getTwUniverse() : getUsUniverse();
}

export async function getUniverseCounts(): Promise<{ tw: number; us: number }> {
  const [tw, us] = await Promise.all([getTwUniverse(), getUsUniverse()]);
  return { tw: tw.length, us: us.length };
}
