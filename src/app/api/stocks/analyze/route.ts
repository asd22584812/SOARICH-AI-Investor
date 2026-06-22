import { NextRequest, NextResponse } from "next/server";
import {
  analyzeStockInput,
  toStockAnalysis,
} from "@/lib/stock/analyzer";
import { getMockStock } from "@/lib/stock/mockData";
import {
  buildStockInputFromYahoo,
  snapshotToNullableMetrics,
} from "@/lib/stock/stock-input-builder";
import { searchStock } from "@/lib/stock/yahoo";

export const runtime = "nodejs";

function shouldUseMockFallback(): boolean {
  return process.env.STOCK_USE_MOCK_FALLBACK === "true";
}

function analyzeFromMock(query: string) {
  const stock = getMockStock(query);
  if (!stock) return null;
  const result = analyzeStockInput(stock);
  return toStockAnalysis(result, stock);
}

export async function GET(request: NextRequest) {
  const q =
    request.nextUrl.searchParams.get("q")?.trim() ??
    request.nextUrl.searchParams.get("symbol")?.trim() ??
    "";

  if (!q) {
    return NextResponse.json({ error: "缺少查詢參數" }, { status: 400 });
  }

  try {
    const snapshot = await searchStock(q);
    if (!snapshot) {
      if (shouldUseMockFallback()) {
        const mockAnalysis = analyzeFromMock(q);
        if (mockAnalysis) return NextResponse.json(mockAnalysis);
      }
      return NextResponse.json({ error: "找不到這檔股票" }, { status: 404 });
    }

    const stockInput = buildStockInputFromYahoo(snapshot);
    if (!stockInput) {
      return NextResponse.json({ error: "無法取得股價資料" }, { status: 404 });
    }

    const result = analyzeStockInput(stockInput);
    const analysis = toStockAnalysis(
      result,
      stockInput,
      snapshot.normalized
        ? snapshotToNullableMetrics(snapshot.normalized)
        : undefined
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("[api/stocks/analyze]", error);

    if (shouldUseMockFallback()) {
      const mockAnalysis = analyzeFromMock(q);
      if (mockAnalysis) return NextResponse.json(mockAnalysis);
    }

    return NextResponse.json(
      { error: "分析失敗，請稍後再試。" },
      { status: 500 }
    );
  }
}
