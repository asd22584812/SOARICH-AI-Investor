import { NextRequest, NextResponse } from "next/server";
import { fetchYahooQuote, searchYahooSymbols } from "@/lib/stock/yahoo";

export const runtime = "nodejs";

function inferCurrency(market: "TW" | "US", currency?: string): "TWD" | "USD" {
  if (currency === "TWD" || market === "TW") return "TWD";
  return "USD";
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const market = request.nextUrl.searchParams.get("market");

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchYahooSymbols(
      q,
      market === "TW" || market === "US" ? market : undefined
    );

    if (results.length === 0) {
      return NextResponse.json([]);
    }

    const enriched = await Promise.all(
      results.slice(0, 8).map(async (item) => {
        try {
          const quote = await fetchYahooQuote(item.yahooSymbol);
          const name =
            quote.shortName ?? quote.longName ?? item.name ?? item.symbol;
          return {
            symbol: item.symbol,
            name,
            market: item.market,
            yahooSymbol: item.yahooSymbol,
            price: quote.regularMarketPrice ?? null,
            change: quote.regularMarketChange ?? null,
            changePercent: quote.regularMarketChangePercent ?? null,
            currency: inferCurrency(item.market, quote.currency),
          };
        } catch {
          return {
            symbol: item.symbol,
            name: item.name,
            market: item.market,
            yahooSymbol: item.yahooSymbol,
            price: null,
            change: null,
            changePercent: null,
            currency: item.market === "TW" ? "TWD" : "USD",
          };
        }
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("[api/stocks/search]", error);
    return NextResponse.json(
      { error: "搜尋失敗，請稍後再試。" },
      { status: 500 }
    );
  }
}
