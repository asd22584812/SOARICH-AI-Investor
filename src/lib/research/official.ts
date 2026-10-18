export interface FinancialYear {
  start: string;
  end: string;
  filed: string;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
  operatingCashflow: number | null;
  capex: number | null;
  freeCashflow: number | null;
  sourceUrl: string;
}
export interface OfficialFinancials {
  provider: "SEC" | "TWSE" | "TPEx";
  currency: string;
  unit: string;
  years: FinancialYear[];
  latestPeriod: string | null;
  publishedOn: string | null;
  sourceUrl: string;
  status: "available" | "unavailable";
  notes: string[];
  shares?: { value: number; asOf: string; sourceUrl: string };
  multipleListings?: boolean;
}

const cache = new Map<string, { until: number; promise: Promise<unknown> }>();
export async function sourceJson<T>(url: string, ttl = 3600000): Promise<T> {
  const hit = cache.get(url);
  if (hit && hit.until > Date.now()) return hit.promise as Promise<T>;
  const promise = (async () => {
    const response = await fetch(url, {
      headers: { "User-Agent": (new URL(url).hostname.endsWith("sec.gov") ? process.env.SEC_USER_AGENT : undefined) || "SOARICH-Investor-Research/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(25000), cache: "no-store",
    });
    if (!response.ok) throw new Error(`${new URL(url).hostname} HTTP ${response.status}`);
    return response.json() as Promise<T>;
  })();
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(url, { until: Date.now() + ttl, promise });
  try { return await promise; } catch (error) { cache.delete(url); throw error; }
}

export interface SecFact { start?: string; end: string; val: number; filed: string; accn: string; form: string; }
export interface SecFacts { cik: number; entityName: string; facts: Record<string, Record<string, { units: Record<string, SecFact[]> }>>; }
interface SecTicker { cik_str: number; ticker: string; title: string; }
const factUrl = (cik: number, accn: string) => `https://www.sec.gov/Archives/edgar/data/${cik}/${accn.replaceAll("-", "")}/${accn}-index.html`;
function facts(data: SecFacts, tags: string[], unit: string): SecFact[] {
  // Tags are aliases, not additive. Retain latest filing for each exact period.
  return tags.flatMap((tag) => data.facts["us-gaap"]?.[tag]?.units[unit] ?? []);
}
function annual(data: SecFacts, tags: string[], unit: string, now: string): Map<string, SecFact> {
  const result = new Map<string, SecFact>();
  for (const f of facts(data, tags, unit)) {
    if (!f.start || !/^10-K(?:\/A)?$/.test(f.form) || f.filed > now || f.end > now || !Number.isFinite(f.val)) continue;
    const days = (Date.parse(f.end) - Date.parse(f.start)) / 86400000;
    if (!Number.isFinite(days) || days < 330 || days > 380) continue; // Never sum YTD and single-quarter facts.
    const key = `${f.start}/${f.end}`;
    const old = result.get(key);
    if (!old || f.filed > old.filed) result.set(key, f);
  }
  return result;
}
export function parseSecFinancials(data: SecFacts, multipleListings = false, now = new Date().toISOString().slice(0, 10)): OfficialFinancials {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(data.cik).padStart(10, "0")}.json`;
  const revenue = annual(data, ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"], "USD", now);
  const income = annual(data, ["NetIncomeLoss"], "USD", now);
  const eps = annual(data, ["EarningsPerShareDiluted"], "USD/shares", now);
  const ocf = annual(data, ["NetCashProvidedByUsedInOperatingActivities"], "USD", now);
  const capex = annual(data, ["PaymentsToAcquirePropertyPlantAndEquipment"], "USD", now);
  const keys = [...new Set([...revenue.keys(), ...income.keys(), ...ocf.keys()])].sort().slice(-10);
  const years = keys.map((key): FinancialYear => {
    const refs = [revenue.get(key), income.get(key), ocf.get(key), capex.get(key), eps.get(key)].filter((f): f is SecFact => !!f);
    const latest = refs.reduce((a, b) => a.filed > b.filed ? a : b);
    const operatingCashflow = ocf.get(key)?.val ?? null;
    const investment = capex.get(key)?.val ?? null;
    return { start: latest.start!, end: latest.end, filed: latest.filed,
      revenue: revenue.get(key)?.val ?? null, netIncome: income.get(key)?.val ?? null,
      eps: eps.get(key)?.val ?? null, operatingCashflow, capex: investment,
      freeCashflow: operatingCashflow != null && investment != null && investment >= 0 ? operatingCashflow - investment : null,
      sourceUrl: factUrl(data.cik, latest.accn) };
  });
  const shares = (data.facts.dei?.EntityCommonStockSharesOutstanding?.units.shares ?? [])
    .filter(f => f.end <= now && f.filed <= now && Number.isFinite(f.val) && f.val > 0 && /^(10-K|10-Q)(\/A)?$/.test(f.form))
    .sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed))[0];
  const all = Object.values(data.facts["us-gaap"] ?? {}).flatMap(tag => Object.values(tag.units).flat())
    .filter(f => f.end <= now && f.filed <= now && /^(10-K|10-Q)(\/A)?$/.test(f.form));
  return { provider: "SEC", currency: "USD", unit: "USD；EPS 為 USD/股", years,
    sourceUrl: url, status: years.length ? "available" : "unavailable",
    latestPeriod: all.map(f => f.end).sort().at(-1) ?? null,
    publishedOn: all.map(f => f.filed).sort().at(-1) ?? null,
    shares: shares ? { value: shares.val, asOf: shares.end, sourceUrl: factUrl(data.cik, shares.accn) } : undefined,
    multipleListings,
    notes: ["數據來自 SEC XBRL；僅列 10-K 全年期間，採截至查詢日的最新申報。", "FCF 為營業現金流減購置不動產、廠房及設備支出，不含所有併購支出。", "不同欄位可能來自不同更正申報，完整欄位紀錄可由 SEC 原始資料連結核對。"],
  };
}
export async function getSecFinancials(symbol: string): Promise<OfficialFinancials> {
  const tickers = Object.values(await sourceJson<Record<string, SecTicker>>("https://www.sec.gov/files/company_tickers.json", 86400000));
  const key = symbol.toUpperCase().replaceAll(".", "-");
  const match = tickers.find(t => t.ticker.replaceAll(".", "-") === key);
  if (!match) throw new Error("SEC 未找到對應公司，不能用相似名稱代替");
  const data = await sourceJson<SecFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(match.cik_str).padStart(10, "0")}.json`);
  return parseSecFinancials(data, tickers.filter(t => t.cik_str === match.cik_str).length > 1);
}
