import type { StockResearchReport } from "@/types/stock";
import type { NormalizedFinancialData } from "./normalizer";

// Yahoo summary fields do not establish filing provenance or multi-year evidence.
// Keep this boundary separate from the legacy scoring engine and saved snapshots.
export function buildResearchReport(data: NormalizedFinancialData): StockResearchReport | null {
  if (data.currentPrice == null || !Number.isFinite(data.currentPrice) || data.currentPrice <= 0) return null;
  return {
    symbol: data.displaySymbol, name: data.name, market: data.market,
    price: data.currentPrice, currency: data.currency,
    change: data.change ?? 0, changePercent: data.changePercent ?? 0,
    changeAvailable: data.change != null && data.changePercent != null,
    quoteAsOf: data.quoteAsOf ?? null, industry: data.industry,
    financialCurrency: data.financialCurrency ?? null,
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(data.yahooSymbol)}/financials/`,
    officialSourceUrl: data.market === "TW" ? "https://mops.twse.com.tw/" : "https://www.sec.gov/edgar/search/",
    valuationStatus: "unverified",
    valuationReasons: [
      "目前為 Yahoo 彙總指標，尚未逐項核對官方財報及報告期間。",
      "尚未取得完整多年財報與公司研究證據，暫不提供合理價、買入判斷或綜合評分。",
      ...(data.currencyMismatch ? ["報價與財報幣別未確認一致，不進行混幣估值。"] : []),
    ],
    financialProfile: {
      roe: data.roe, roa: data.roa, grossMargin: data.grossMargin,
      operatingMargin: data.operatingMargin, debtToEquity: data.debtToEquity,
      eps: data.eps, growthRate: data.revenueGrowth, pe: data.pe.value,
      pb: data.pb.value, marketCap: data.marketCap,
    },
  };
}
