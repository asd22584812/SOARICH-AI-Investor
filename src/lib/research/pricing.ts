/** Transparent no-growth capitalization scenarios, not predictions or a probability of profit. */
export interface StatementRow {
  end: string; months: 3 | 12; epsBasis?: "diluted" | "basic" | "unknown";
  revenue: number | null; income: number | null; eps: number | null;
  ocf: number | null; capex: number | null; fcf: number | null;
  grossProfit: number | null; operatingIncome: number | null;
  equity: number | null; assets: number | null; debt: number | null;
  shares: number | null;
}
export interface PricingEvidence {
  provider: 'Yahoo Finance'; currency: string | null; sourceUrl: string;
  annual: StatementRow[]; quarterly: StatementRow[]; warnings: string[];
}
export interface EntryValuation {
  status: 'available' | 'unavailable'; method: string; reasons: string[];
  fair: number | null; low: number | null; high: number | null; entry: number | null;
  margin: number | null; eligible: boolean; signal: string;
  normalizedEps: number | null; normalizedFcfPerShare: number | null;
  shares: number | null; period: string | null; formulas: string[];
  metrics: { label: string; value: number | null; unit: string; formula: string }[];
}
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
export function parseStatementRows(input: unknown, months: 3 | 12, now = Date.now()): StatementRow[] {
  if (!Array.isArray(input)) return [];
  const rows = new Map<string, StatementRow>();
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const date = r.date instanceof Date ? r.date : new Date(String(r.date));
    if (r.periodType !== `${months}M` || !Number.isFinite(date.getTime()) || date.getTime() > now) continue;
    const ocf = finite(r.operatingCashFlow), rawCapex = finite(r.capitalExpenditure);
    // Yahoo capital expenditure is a cash outflow (negative). Positive values are not silently flipped.
    const capex = rawCapex != null && rawCapex <= 0 ? -rawCapex : null;
    const fcf = ocf != null && capex != null ? ocf - capex : null;
    const reportedFcf = finite(r.freeCashFlow);
    const agrees = reportedFcf == null || fcf == null || Math.abs(reportedFcf-fcf) <= Math.max(1,Math.abs(fcf)*0.01);
    const end = date.toISOString().slice(0,10);
    rows.set(end, {end,months,revenue:finite(r.totalRevenue),income:finite(r.netIncomeCommonStockholders) ?? finite(r.netIncome),
      eps:finite(r.dilutedEPS) ?? finite(r.basicEPS),epsBasis:finite(r.dilutedEPS)!=null?'diluted':finite(r.basicEPS)!=null?'basic':'unknown',ocf,capex,fcf:agrees?fcf:null,
      grossProfit:finite(r.grossProfit),operatingIncome:finite(r.operatingIncome),
      equity:finite(r.commonStockEquity) ?? finite(r.stockholdersEquity),assets:finite(r.totalAssets),debt:finite(r.totalDebt),shares:finite(r.ordinarySharesNumber)});
  }
  return [...rows.values()].sort((a,b)=>a.end.localeCompare(b.end));
}
const sum = (rows: StatementRow[], key: keyof StatementRow): number | null => rows.every(r=>typeof r[key]==='number' && Number.isFinite(r[key])) ? rows.reduce((s,r)=>s+Number(r[key]),0) : null;
const median = (values: number[]) => values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
const ratio = (a: number | null, b: number | null, percent = false) => a!=null && b!=null && b>0 ? a/b*(percent?100:1) : null;
export function calculateEntry(e: PricingEvidence, input: {price:number; currency:string; asOf:string|null; sector:string|null; marketCap:number|null; shares?:number|null}, now=Date.now()): EntryValuation {
  const out: EntryValuation = {status:'unavailable',method:'零成長獲利／現金流資本化',reasons:[],fair:null,low:null,high:null,entry:null,margin:null,eligible:false,signal:'資料不足',normalizedEps:null,normalizedFcfPerShare:null,shares:null,period:null,formulas:[],metrics:[]};
  const annual=e.annual.slice(-3), quarters=e.quarterly.slice(-4), latest=quarters.at(-1);
  const age=(d:string|null|undefined)=>d && Number.isFinite(Date.parse(d))?(now-Date.parse(d))/86400000:Infinity;
  const contiguous=(rows:StatementRow[],min:number,max:number)=>rows.every((r,i)=>i===0 || (Date.parse(r.end)-Date.parse(rows[i-1].end))/86400000>=min && (Date.parse(r.end)-Date.parse(rows[i-1].end))/86400000<=max);
  if (!e.currency || e.currency!==input.currency) out.reasons.push('財報幣別與報價未確認一致。');
  if (annual.length<3 || !contiguous(annual,330,400) || age(annual.at(-1)?.end)>550) out.reasons.push('缺少連續三年完整年度財報。');
  if (quarters.length!==4 || !contiguous(quarters,65,115) || age(latest?.end)>210) out.reasons.push('缺少連續四季或最近季度過舊，不能計算 TTM。');
  if (age(input.asOf)>7 || age(input.asOf)<-1 || !Number.isFinite(input.price) || input.price<=0) out.reasons.push('報價缺失或超過七日。');
  if(quarters.length!==4 || !contiguous(quarters,65,115)) return out;
  const shares=input.shares ?? latest?.shares ?? null;
  out.shares=shares;out.period=quarters[0].end+'～'+latest!.end+'（四個單季加總）';
  const income=sum(quarters,'income'), revenue=sum(quarters,'revenue'), ocf=sum(quarters,'ocf'),fcf=sum(quarters,'fcf');
  const gross=sum(quarters,'grossProfit'),op=sum(quarters,'operatingIncome');
  const priorBalance=e.quarterly.find(r => {const d=(Date.parse(latest!.end)-Date.parse(r.end))/86400000;return d>=330 && d<=400;});
  const averageEquity=priorBalance?.equity!=null && latest?.equity!=null?(priorBalance.equity+latest.equity)/2:null;
  const averageAssets=priorBalance?.assets!=null && latest?.assets!=null?(priorBalance.assets+latest.assets)/2:null;
  out.metrics=[
    {label:'TTM 營收',value:revenue,unit:e.currency!,formula:'最近四個單季營收加總'},
    {label:'TTM 歸屬股東淨利',value:income,unit:e.currency!,formula:'最近四個單季歸屬股東淨利加總'},
    {label:'TTM 毛利率',value:ratio(gross,revenue,true),unit:'%',formula:'四季毛利總和 ÷ 四季營收總和'},
    {label:'TTM 營業利益率',value:ratio(op,revenue,true),unit:'%',formula:'四季營業利益總和 ÷ 四季營收總和'},
    {label:'TTM 淨利率',value:ratio(income,revenue,true),unit:'%',formula:'四季歸屬股東淨利 ÷ 四季營收'},
    {label:'TTM ROE',value:ratio(income,averageEquity,true),unit:'%',formula:'四季歸屬股東淨利 ÷ 期初與期末普通股權益平均'},
    {label:'TTM ROA（股東淨利口徑）',value:ratio(income,averageAssets,true),unit:'%',formula:'四季歸屬股東淨利 ÷ 期初與期末資產平均'},
    {label:'有息負債／權益',value:ratio(latest!.debt,latest!.equity),unit:'倍',formula:'最新季有息負債 ÷ 普通股權益；不是總負債比'},
    {label:'TTM 營業現金流',value:ocf,unit:e.currency!,formula:'四季營業現金流加總'},
    {label:'TTM 自由現金流',value:fcf,unit:e.currency!,formula:'四季營業現金流 − 四季資本支出'},
    {label:'TTM EPS（來源口徑）',value:new Set(quarters.map(q=>q.epsBasis??'unknown')).size===1?sum(quarters,'eps'):null,unit:e.currency!+'/股',formula:'四個單季同口徑 EPS 加總；基本與稀釋混用時不加總，拆股可能影響比較'},
  ];
  const lastYear=annual.at(-1), priorYear=annual.at(-2);
  if(lastYear && priorYear && contiguous([priorYear,lastYear],330,400)){
    const growth=lastYear.revenue!=null && priorYear.revenue!=null && priorYear.revenue>0?(lastYear.revenue/priorYear.revenue-1)*100:null;
    out.metrics.push({label:'最近完整年度營收年增率',value:growth,unit:'%',formula:`${lastYear.end} 年度營收 ÷ ${priorYear.end} 年度營收 − 1；歷史成長不代表未來預測`});
  }
  if(shares==null || !Number.isFinite(shares) || shares<=0) out.reasons.push('缺少有效普通股股數。');
  if(!input.marketCap || input.marketCap<=0) out.reasons.push('缺少市值，無法核對股數與報價口徑。');
  if(shares && input.marketCap && Math.abs(input.price*shares/input.marketCap-1)>.15) out.reasons.push('股數與市值口徑不一致，可能有 ADR、股別或拆股差異。');
  if(income==null || income<=0 || annual.some(y=>y.income==null || y.income<=0)) out.reasons.push('最近四季或歷年獲利不足，正盈餘模型不適用。');
  if(out.reasons.length) return out;
  const normalIncome=Math.min(income!,median(annual.map(y=>y.income!)));
  out.normalizedEps=normalIncome/shares!;
  const financial=/financial|bank|insurance|金融|銀行|保險/i.test(input.sector??'');
  const realEstate=/real estate|reit/i.test(input.sector??'');
  if(realEstate) {out.reasons.push('不動產業先排除：需區分 REIT 的 FFO/AFFO 與開發商資產估值，不能統一套用本模型。');return out;}
  let perShare=out.normalizedEps;
  if(!financial){
    if(fcf==null || fcf<=0 || annual.some(y=>y.fcf==null || y.fcf<=0)){out.reasons.push('現金流不足或為負，不能支持本模型的入場價。');return out;}
    out.normalizedFcfPerShare=Math.min(fcf,median(annual.map(y=>y.fcf!)))/shares!;
    perShare=Math.min(perShare,out.normalizedFcfPerShare);
  } else out.method='金融股零成長盈餘資本化（不套用一般企業 FCF）';
  out.low=perShare/.12;out.fair=perShare/.10;out.high=perShare/.08;
  out.entry=Math.min(out.low,out.fair*.80);out.margin=(out.fair-input.price)/out.fair*100;
  out.status='available';out.eligible=!!input.sector && input.price<=out.entry;
  out.signal=out.eligible?'符合模型入場條件':input.price<=out.entry?'價格達標，產業資料待核對':input.price<=out.fair?'接近合理區間，等待安全邊際':'高於本模型合理價';
  out.formulas=[
    `常態淨利 = min(TTM 歸屬股東淨利, 最近三個完整年度淨利中位數)；常態 EPS = 常態淨利 ÷ 最新普通股數。`,
    financial?'金融股使用常態 EPS，不使用營業現金流扣資本支出。':'常態 FCF/股 = min(TTM FCF, 三年 FCF 中位數) ÷ 最新普通股數；估值基數取常態 EPS 與常態 FCF/股較低值。',
    '零成長資本化：每股價值 = 每股常態獲利基數 ÷ 要求報酬率；保守 12%、基準 10%、樂觀 8%。這些是模型假設，不是市場共識。',
    '入場參考上限 = min(保守價, 基準價 × 80%)；安全邊際 = (基準價 − 現價) ÷ 基準價。',
  ];
  out.reasons.push('假設獲利不成長且能長期維持，可能低估成長公司，也可能高估衰退或景氣高峰公司。','此為可追溯的簡化模型，不是完整企業估值、價格預測或不賠保證。');
  if(!input.sector)out.reasons.push('產業尚未核對，不列入首頁入場候選。');
  return out;
}
