import { NextRequest, NextResponse } from "next/server";
import type { Market } from "@/types/stock";
import { getScanStatus } from "@/lib/db/market-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") as Market | null;

  if (market !== "TW" && market !== "US") {
    return NextResponse.json({ error: "缺少或無效的 market 參數" }, { status: 400 });
  }

  const status = getScanStatus(market);

  return NextResponse.json({
    market,
    ...status,
    message: status.scanning || !status.hasData ? "正在更新市場資料" : null,
  });
}
