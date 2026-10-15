import type { OfficialFinancials } from "./official";
export interface ValuationScenario { label: string; value: number; growth: number; discount: number; terminalGrowth: number; }
export interface ScenarioResult { status: "available" | "unavailable"; reasons: string[]; scenarios: ValuationScenario[]; baseCashflow?: number; shares?: number; basis?: string; }
export function discountCashflow(fcf: number, shares: number, growth: number, discount: number, terminal: number): number {
  if (![fcf, shares, growth, discount, terminal].every(Number.isFinite) || fcf <= 0 || shares <= 0 || growth <= -1 || discount <= terminal || discount <= 0) throw new Error("無效估值輸入");
  let value = 0;
  for (let t = 1; t <= 5; t++) value += fcf * (1 + growth) ** t / (1 + discount) ** t;
  value += fcf * (1 + growth) ** 5 * (1 + terminal) / (discount - terminal) / (1 + discount) ** 5;
  return value / shares;
}
export function calculateScenarios(official: OfficialFinancials, input: { currency: string; classification: string; quoteAsOf: string | null }, now = new Date()): ScenarioResult {
  const reasons: string[] = [];
  const age = (date: string | null | undefined) => date && Number.isFinite(Date.parse(date)) ? (now.getTime() - Date.parse(date)) / 86400000 : Infinity;
  const years = official.years.slice(-5);
  if (official.provider !== "SEC" || official.currency !== input.currency) reasons.push("缺少同幣別的完整年度現金流，無法套用此模型。");
  if (!["growth", "quality_compounder", "value"].includes(input.classification)) reasons.push("此產業或分類尚無適用的已驗證估值模型。");
  if (official.multipleListings) reasons.push("同公司有多個上市證券，尚未確認股別及換算比例。");
  if (years.length < 5 || years.some(y => y.freeCashflow == null || !Number.isFinite(y.freeCashflow) || y.freeCashflow <= 0)) reasons.push("需要最近五個完整年度且每年為正的自由現金流。");
  if (years.some((y, i) => i > 0 && Math.abs(Date.parse(y.start) - Date.parse(years[i-1].end) - 86400000) > 86400000)) reasons.push("年度資料有缺口，不能當作連續五年。");
  if (age(years.at(-1)?.end) > 450 || age(official.latestPeriod) > 150 || age(official.latestPeriod) < 0) reasons.push("財報期間過舊或最近一期缺漏。");
  if (!official.shares || !Number.isFinite(official.shares.value) || official.shares.value <= 0 || age(official.shares.asOf) > 150 || age(official.shares.asOf) < 0) reasons.push("缺少近期官方流通股數。");
  if (age(input.quoteAsOf) > 7 || age(input.quoteAsOf) < -1) reasons.push("報價時間未確認或已過期。");
  if (reasons.length) return { status: "unavailable", reasons, scenarios: [] };
  const recent = years.slice(-3).map(y => y.freeCashflow!);
  const base = Math.min(recent.at(-1)!, recent.reduce((a,b) => a+b,0)/3);
  const cagr = (years.at(-1)!.freeCashflow! / years[0].freeCashflow!) ** 0.25 - 1;
  const growth = Math.max(-0.1, Math.min(0.06, cagr));
  const assumptions = [
    { label: "保守情境", growth: Math.min(0, growth - 0.02), discount: 0.12, terminalGrowth: 0.015 },
    { label: "基準情境", growth, discount: 0.10, terminalGrowth: 0.02 },
    { label: "樂觀情境", growth: Math.min(0.10, growth + 0.02), discount: 0.09, terminalGrowth: 0.025 },
  ];
  return { status: "available", reasons: ["情境試算，不是價格預測、買入建議或不賠機率。", "使用已付利息後的營業現金流減設備投資；未完整模型化未來借款、併購與稀釋，不能視為完整股權估值。"],
    baseCashflow: base, shares: official.shares!.value,
    basis: "基期採最近年度 FCF 與最近三年平均 FCF 的較低值；成長依五年 FCF CAGR 限制於 -10%～6%，預測五年後進入永續期。",
    scenarios: assumptions.map(a => ({ ...a, value: discountCashflow(base, official.shares!.value, a.growth, a.discount, a.terminalGrowth) })),
  };
}
