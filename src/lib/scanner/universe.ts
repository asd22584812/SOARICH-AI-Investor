import type { Market } from "@/types/stock";
import { getAllTaiwanStocks } from "@/lib/stock/twStockList";

const SP500_CSV_URL =
  "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv";

const NASDAQ100_CSV_URL =
  "https://raw.githubusercontent.com/datasets/nasdaq-listings/main/data/nasdaq-listed.csv";

/** Fallback Nasdaq 100 symbols if remote fetch fails */
const NASDAQ100_FALLBACK = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "GOOGL", "TSLA", "AVGO", "COST",
  "NFLX", "AMD", "ADBE", "PEP", "CSCO", "INTC", "CMCSA", "TXN", "QCOM", "INTU",
  "AMGN", "HON", "AMAT", "BKNG", "ISRG", "VRTX", "ADP", "GILD", "MU", "LRCX",
  "PANW", "REGN", "MDLZ", "ADI", "KLAC", "SNPS", "CDNS", "MELI", "PYPL", "CRWD",
  "MAR", "CSX", "ORLY", "ABNB", "FTNT", "ADSK", "CHTR", "MNST", "WDAY", "PCAR",
  "CPRT", "NXPI", "AEP", "ROP", "FAST", "ROST", "BKR", "EXC", "XEL", "PAYX",
  "ODFL", "KDP", "EA", "CTSH", "GEHC", "VRSK", "LULU", "KHC", "CSGP", "DXCM",
  "MCHP", "BIIB", "IDXX", "TTWO", "ON", "ANSS", "CDW", "GFS", "WBD", "ZS",
  "DDOG", "TEAM", "ILMN", "SIRI", "ENPH", "ALGN", "MRVL", "DLTR", "EBAY", "SPLK",
  "WBA", "LCID", "RIVN", "OKTA", "DOCU", "ZM", "SGEN", "FANG", "MRNA", "ARM",
];

const SP500_FALLBACK = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "BRK-B", "TSLA", "UNH", "JPM",
  "V", "XOM", "JNJ", "WMT", "MA", "PG", "HD", "CVX", "MRK", "ABBV",
  "KO", "PEP", "COST", "AVGO", "LLY", "TMO", "MCD", "CSCO", "ACN", "ABT",
  "DHR", "WFC", "BAC", "CRM", "LIN", "AMD", "DIS", "TXN", "PM", "NEE",
  "RTX", "HON", "UPS", "IBM", "QCOM", "INTU", "AMAT", "CAT", "GE", "MS",
];

export interface UniverseSymbol {
  query: string;
  market: Market;
  yahooSymbol?: string;
}

function parseCsvSymbols(csv: string, symbolColumn = "Symbol"): string[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const symbolIndex = headers.findIndex(
    (h) => h.toLowerCase() === symbolColumn.toLowerCase()
  );
  if (symbolIndex < 0) return [];

  const symbols: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!cols?.[symbolIndex]) continue;
    const symbol = cols[symbolIndex].replace(/"/g, "").trim();
    if (symbol) symbols.push(symbol);
  }
  return symbols;
}

async function fetchCsvSymbols(
  url: string,
  symbolColumn: string,
  fallback: string[]
): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SOARICH-Market-Scanner/1.0" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return fallback;
    const csv = await response.text();
    const symbols = parseCsvSymbols(csv, symbolColumn);
    return symbols.length > 0 ? symbols : fallback;
  } catch {
    return fallback;
  }
}

async function fetchNasdaq100Symbols(): Promise<string[]> {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/ArjunVachhani/Nasdaq-100-Companies/main/nasdaq100.csv",
      {
        headers: { "User-Agent": "SOARICH-Market-Scanner/1.0" },
        next: { revalidate: 86400 },
      }
    );
    if (response.ok) {
      const csv = await response.text();
      const symbols = parseCsvSymbols(csv, "Symbol");
      if (symbols.length >= 90) return symbols;
    }
  } catch {
    // fall through
  }
  return NASDAQ100_FALLBACK;
}

export async function getUsUniverse(): Promise<UniverseSymbol[]> {
  const [sp500, nasdaq100] = await Promise.all([
    fetchCsvSymbols(SP500_CSV_URL, "Symbol", SP500_FALLBACK),
    fetchNasdaq100Symbols(),
  ]);

  const unique = [...new Set([...sp500, ...nasdaq100])];
  return unique.map((query) => ({ query, market: "US" as const }));
}

export async function getTwUniverse(): Promise<UniverseSymbol[]> {
  const stocks = await getAllTaiwanStocks();
  return stocks.map((stock) => ({
    query: stock.symbol,
    market: "TW" as const,
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
