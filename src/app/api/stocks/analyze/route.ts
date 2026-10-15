import { NextRequest, NextResponse } from "next/server";
import { buildResearchReport } from "@/lib/stock/research-report";
import { searchStock } from "@/lib/stock/yahoo";

export const runtime = "nodejs";
export const maxDuration = 60;

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
      return NextResponse.json({ error: "未取得股票資料，請確認代號或稍後重試" }, { status: 502 });
    }

    const analysis = buildResearchReport(snapshot.normalized);
    if (!analysis) {
      return NextResponse.json({ error: "無法取得股價資料" }, { status: 502 });
    }

    return NextResponse.json(analysis, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/stocks/analyze]", error);


    return NextResponse.json(
      { error: "分析失敗，請稍後再試。" },
      { status: 500 }
    );
  }
}
