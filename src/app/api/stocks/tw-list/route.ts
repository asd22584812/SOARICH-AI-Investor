import { NextResponse } from "next/server";
import {
  getAllTaiwanStocks,
  setTaiwanStockListMemoryCache,
} from "@/lib/stock/twStockList";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stocks = await getAllTaiwanStocks();
    setTaiwanStockListMemoryCache(stocks);

    return NextResponse.json({
      count: stocks.length,
      fetchedAt: Date.now(),
      stocks,
    });
  } catch (error) {
    console.error("[api/stocks/tw-list]", error);
    return NextResponse.json(
      { error: "台股清單載入失敗" },
      { status: 500 }
    );
  }
}
