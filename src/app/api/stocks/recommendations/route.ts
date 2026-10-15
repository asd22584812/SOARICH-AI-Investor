import { NextRequest, NextResponse } from "next/server";
import type { HomeFeedResponse } from "@/types/stock";

export const runtime = "nodejs";

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
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
