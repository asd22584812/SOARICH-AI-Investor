import { getResearchRadar } from "@/lib/research/radar";
import { NextRequest, NextResponse } from "next/server";
import type { HomeFeedResponse } from "@/types/stock";

export const runtime = "nodejs";
export const maxDuration = 60;

// Legacy snapshots contain heuristic ratings, not verified filing evidence.
// Do not republish them or start a full-market scan on a visitor request.
export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market");
  if (market !== "TW" && market !== "US") {
    return NextResponse.json({ error: "缺少或無效的 market 參數" }, { status: 400 });
  }
  const response: HomeFeedResponse = {
    assessmentStatus: "data_unverified",
    scanning: false,
    message: "推薦暫停：尚未完成官方財報、期間與估值依據核對。這不代表市場沒有符合條件的股票。可先搜尋個股查看來源指標。",
    feed: { todayFocus: [], undervalued: [], highQuality: [], moat: [] },
    sectionCounts: { todayFocus: 0, undervalued: 0, highQuality: 0, moat: 0 },
    popular: [], lastScannedAt: null,
  };
  try {
    response.researchRadar = await getResearchRadar(market);
    response.assessmentStatus = "research_only";
    response.message = "以下為有來源的研究初篩，尚未確認合理價，不是買入建議。";
  } catch (error) {
    response.assessmentStatus = "source_error";
    response.message = `市場來源讀取失敗：${error instanceof Error ? error.message : "暫時無法連線"}。未以固定名單補位。`;
  }
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
