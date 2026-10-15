import { NextRequest, NextResponse } from "next/server";
import { buildResearchReport } from "@/lib/stock/research-report";
import { getSecFinancials } from "@/lib/research/official";
import { getTaiwanFinancials, getTaiwanReport } from "@/lib/research/taiwan";
import { calculateScenarios } from "@/lib/research/scenarios";
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
    if (/^\d{4}(?:\.TW|\.TWO)?$/i.test(q) || /[\u4e00-\u9fff]/.test(q)) {
      const officialReport = await getTaiwanReport(q);
      if (officialReport) return NextResponse.json(officialReport, { headers: { "Cache-Control": "no-store" } });
    }
    const secSymbol = /^[A-Z]+(?:[.-][A-Z])?$/i.test(q) ? q.toUpperCase() : null;
    const secPending = secSymbol ? getSecFinancials(secSymbol).then(data => ({ data, error: null }), error => ({ data: null, error })) : null;
    const snapshot = await searchStock(q);
    if (!snapshot) {
      return NextResponse.json({ error: "未取得股票資料，請確認代號或稍後重試" }, { status: 502 });
    }

    const analysis = buildResearchReport(snapshot.normalized);
    if (!analysis) {
      return NextResponse.json({ error: "無法取得股價資料" }, { status: 502 });
    }

    try {
      const prefetched = secPending && snapshot.yahooSymbol.toUpperCase() === secSymbol ? await secPending : null;
      if (prefetched?.error) throw prefetched.error;
      analysis.official = prefetched?.data ?? (snapshot.market === "TW"
        ? await getTaiwanFinancials(snapshot.displaySymbol, snapshot.yahooSymbol.endsWith(".TWO"))
        : await getSecFinancials(snapshot.yahooSymbol));
      analysis.scenarioValuation = calculateScenarios(analysis.official, {
        currency: snapshot.currency,
        classification: /reit|real estate/i.test(`${snapshot.normalized.sector} ${snapshot.industry}`) ? "financial" : snapshot.normalized.companyClassification,
        quoteAsOf: analysis.quoteAsOf ?? null,
      });
      analysis.valuationReasons = ["官方財報已取得；原始數值與模型假設分開呈現。", "護城河、管理層與關鍵人物尚無完整證據，不提供評分或風險結論。"];
    } catch (error) {
      analysis.officialError = error instanceof Error ? error.message : "官方財報來源暫時無法取得";
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
