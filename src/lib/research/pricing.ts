/** Dated evidence and explicit reinvestment/earnings valuation scenarios. */
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
  models?: import("./classic").ClassicModel[];
  scenarios?: {label:string; growth:number; discount:number; terminalGrowth:number; terminalRoe:number; value:number}[];
  guide?: {label:string; result:string; price:number|null; note:string}[];
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
const ratio = (a: number | null, b: number | null, percent = false) => a!=null && b!=null && b>0 ? a/b*(percent?100:1) : null;
/** Equity earnings less reinvestment; not enterprise FCF or actual promised dividends.
 * Five growth years, five-year fade, then stable earnings and reinvestment. */
export function earningsValue(eps:number, roe:number, growth:number, discount:number, terminalGrowth=0.02) {
  if (![eps,roe,growth,discount,terminalGrowth].every(Number.isFinite) || eps<=0 || roe<=0 || growth<0 || growth>=roe || discount<=terminalGrowth || terminalGrowth<0) return NaN;
  const terminalRoe=Math.max(discount,Math.min(roe,0.15));
  let earnings=eps, pv=0;
  for(let year=1;year<=10;year++){
    const fade=Math.max(0,(year-5)/5);
    const g=growth+(terminalGrowth-growth)*fade;
    const returnOnEquity=roe+(terminalRoe-roe)*fade;
    earnings*=1+g;
    pv+=earnings*(1-g/returnOnEquity)/Math.pow(1+discount,year);
  }
  pv+=earnings*(1+terminalGrowth)*(1-terminalGrowth/terminalRoe)/(discount-terminalGrowth)/Math.pow(1+discount,10);
  return pv;
}
export function calculateEntry(e: PricingEvidence, input: {price:number; currency:string; asOf:string|null; sector:string|null; marketCap:number|null; shares?:number|null}, now=Date.now()): EntryValuation {
  const out: EntryValuation = {status:'unavailable',method:'兩階段盈餘再投資折現（含五年成長淡出）',reasons:[],fair:null,low:null,high:null,entry:null,margin:null,eligible:false,signal:'資料不足',normalizedEps:null,normalizedFcfPerShare:null,shares:null,period:null,formulas:[],metrics:[]};
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
  const epsTtm=out.metrics.find(m=>m.label.startsWith('TTM EPS'))?.value??null;
  const book=shares && latest?.equity!=null && latest.equity>0?latest.equity/shares:null;
  out.guide=[
    {label:'EPS 十年持續成長',result:'未驗證',price:null,note:`目前取得 ${e.annual.filter(y=>y.eps!=null).length} 年 EPS；不足十年不能給通過分數。`},
    {label:'股息十年穩定／殖利率 4%',result:'未驗證',price:null,note:'尚無完整每股股息紀錄。殖利率不是股息成長率；門檻價 = 可持續年度每股股息 ÷ 4%。'},
    {label:'FCF 十年為正',result:'未驗證',price:null,note:`目前取得 ${e.annual.filter(y=>y.fcf!=null).length} 年現金流；十年連續性尚不足。`},
    {label:'ROE > 15%',result:ratio(income,averageEquity)==null?'未提供':ratio(income,averageEquity)!>.15?'本期達標':'本期未達標',price:null,note:'以期初期末平均普通股權益計算；不代表十年穩定，高槓桿亦可能推升 ROE。'},
    {label:'利息保障倍數 > 4／10',result:'未驗證',price:null,note:'需同期間 EBIT ÷ 利息費用；缺值不代表零負債，也不給分。'},
    {label:'淨利率 > 10%／20%',result:ratio(income,revenue)==null?'未提供':`${(ratio(income,revenue)!*100).toFixed(2)}%`,price:null,note:'依產業比較，銀行等不同收入結構不能直接橫向排名。'},
    {label:'攻略 P/E = 12 門檻價',result:epsTtm!=null&&epsTtm>0?'可計算':'EPS 口徑不足',price:e.currency===input.currency&&epsTtm!=null&&epsTtm>0?epsTtm*12:null,note:'TTM 同口徑 EPS × 12；只是固定倍數門檻，不是已證明的合理價。'},
    {label:'攻略 P/B = 0.8 門檻價',result:book!=null&&book>0?'可計算':'權益不足',price:e.currency===input.currency&&book!=null&&book>0?book*.8:null,note:'普通股帳面權益 ÷ 股數 × 0.8；帳面價值不等於清算可回收金額。'},
    {label:'PEG < 1',result:'未驗證',price:null,note:'需要可比且經拆股調整的 1／3／5／10 年 EPS 與未來成長假設；不以營收成長代替 EPS 成長。'},
  ];
  if(shares==null || !Number.isFinite(shares) || shares<=0) out.reasons.push('缺少有效普通股股數。');
  if(!input.marketCap || input.marketCap<=0) out.reasons.push('缺少市值，無法核對股數與報價口徑。');
  if(shares && input.marketCap && Math.abs(input.price*shares/input.marketCap-1)>.15) out.reasons.push('股數與市值口徑不一致，可能有 ADR、股別或拆股差異。');
  if(income==null || annual.some(y=>y.income==null)) out.reasons.push('來源缺少單季或年度淨利欄位，無法完成此盈餘模型；不表示公司虧損。');
  else if(income<=0 || annual.some(y=>y.income!<=0)){out.signal='盈餘模型不適用';out.reasons.push('來源獲利為零或負值，需改查資產或其他估值方法。');}
  if(out.reasons.length) {out.guide?.forEach(g=>{g.price=null;});return out;}
  out.normalizedEps=income!/shares!;
  const financial=/financial|bank|insurance|金融|銀行|保險/i.test(input.sector??'');
  if(/real estate|reit/i.test(input.sector??'')) {out.reasons.push('不動產需個別 FFO/AFFO 或資產估值，本盈餘模型不適用。');return out;}
  const roe=ratio(income,averageEquity);
  if(roe==null || roe<=0 || roe>1){out.reasons.push('缺少可靠平均權益或 ROE 超過 100%，需先核對槓桿與一次性損益。');return out;}
  if(!financial){
    if(fcf==null || fcf<=0 || annual.some(y=>y.fcf==null || y.fcf<=0)){out.signal=fcf==null||annual.some(y=>y.fcf==null)?'現金流欄位缺漏':'現金流條件未通過';out.reasons.push(fcf==null||annual.some(y=>y.fcf==null)?'來源缺少現金流欄位；不等於現金流為零。':`TTM 自由現金流 ${fcf} ${input.currency}；TTM 或歷年存在非正現金流，此盈餘模型暫不採用，其他方法獨立評估。`);return out;}
    out.normalizedFcfPerShare=fcf/shares!;
  }
  const first=annual[0],last=annual[2];
  if(first.revenue==null || first.revenue<=0 || last.revenue==null || last.revenue<=0){out.reasons.push('年度營收不足，無法檢查成長假設。');return out;}
  const revenueGrowth=Math.pow(last.revenue/first.revenue,1/2)-1;
  const incomeGrowth=Math.pow(last.income!/first.income!,1/2)-1;
  const growth=Math.max(0,Math.min(revenueGrowth,incomeGrowth,.15,roe*.75));
  out.scenarios=[['保守',growth*.5,.12],['基準',growth,.10],['樂觀',Math.min(growth*1.25,.20,roe*.8),.08]].map(([label,g,r])=>({label:String(label),growth:Number(g),discount:Number(r),terminalGrowth:.02,terminalRoe:Math.max(Number(r),Math.min(roe,.15)),value:earningsValue(out.normalizedEps!,roe,Number(g),Number(r))}));
  const scenarioValues=out.scenarios.map(s=>s.value).filter(Number.isFinite);
  let fair=out.scenarios[1]?.value ?? NaN;
  let low=scenarioValues.length?Math.min(...scenarioValues):NaN;
  let high=scenarioValues.length?Math.max(...scenarioValues):NaN;

  // 美股課程門檻（圖三）：資產股 PB0.8、成長股 PE12、股息股殖利率 4%
  const pe12=out.normalizedEps>0?out.normalizedEps*12:null;
  const pb08=book!=null&&book>0?book*0.8:null;
  const courseAnchors=[pe12,pb08].filter((v):v is number=>v!=null&&Number.isFinite(v)&&v>0);
  const maxFair=input.price*2.5;

  // 防護：折現結果若遠高於現價／課程門檻，改採課程錨點，避免出現「歷史從沒到過」的天價
  if(!Number.isFinite(fair) || fair<=0 || fair>maxFair){
    if(courseAnchors.length){
      fair=courseAnchors.sort((a,b)=>a-b)[Math.floor((courseAnchors.length-1)/2)];
      low=Math.min(...courseAnchors);
      high=Math.max(...courseAnchors,fair);
      out.method='課程門檻估值（PE×12 / PB×0.8；折現結果過高已捨棄）';
      out.reasons.push(`盈餘折現結果不合理（相對現價超過 2.5 倍或非正數），已改用美股課程攻略門檻。幣別 ${input.currency}。`);
    }else{
      out.reasons.push('盈餘折現結果不合理且缺少可用課程門檻，暫停估價。');
      return out;
    }
  }else{
    // 仍用折現，但高估情境不超過現價 2.5 倍
    fair=Math.min(fair,maxFair);
    high=Math.min(high,maxFair);
    low=Math.min(low,fair);
  }

  out.low=low;out.fair=fair;out.high=high;
  out.entry=Math.min(low,fair*0.8);
  if(pb08!=null) out.entry=Math.min(out.entry,pb08);
  if(pe12!=null) out.entry=Math.min(out.entry,pe12);
  out.margin=(out.fair-input.price)/out.fair*100;
  out.status='available';out.eligible=!!input.sector && input.price<=out.entry;
  out.signal=out.eligible?'進入模型買入研究區':input.price<=out.entry?'價格達標，產業待核對':input.price<=out.fair?'低於基準合理價，安全邊際尚不足':'高於模型基準合理價';
  out.formulas=[
    `起始每股盈餘 = TTM 股東淨利 ${income} ÷ 最新普通股數 ${shares} = ${out.normalizedEps} ${input.currency}/股。這是估值每股基數，不是加權平均股數的公告 EPS。`,
    `年度營收 CAGR ${(revenueGrowth*100).toFixed(2)}%；股東淨利 CAGR ${(incomeGrowth*100).toFixed(2)}%；期間 ${first.end}～${last.end}（兩年跨度）。基準成長取兩者較低，限制 0～15% 且不超過 ROE 的 75%。衰退公司此假設可能過度樂觀。`,
    `ROE = TTM 淨利 ÷ 平均普通股權益 = ${(roe*100).toFixed(2)}%。模型保留比例 = 成長率 ÷ ROE；可分配盈餘 = 預測盈餘 × (1 − 保留比例)，不是實際承諾股息。`,
    '第 1～5 年維持情境成長，第 6～10 年成長率線性收斂至 2%；ROE 同期收斂至 min(目前 ROE,15%)，但不低於折現率。',
    '合理價 = Σ[第 t 年每股可分配盈餘 ÷ (1+r)^t] + [第 11 年每股可分配盈餘 ÷ (r−2%)] ÷ (1+r)^10。折現率為 12%／10%／8% 情境假設，並非已估計的個股資金成本。',
    '入場上限 = min(保守情境價, 基準合理價 × 80%, 課程 PB0.8／PE12 門檻)。安全邊際 = (基準合理價 − 現價) ÷ 基準合理價。',
    `幣別防護：財報幣別必須為 ${input.currency}；合理價不得超過現價 2.5 倍。`,
  ];
  out.reasons.push('盈餘再投資模型假設未來獲利可轉為股東可分配資金；未調整一次性損益、未來稀釋及產業循環，應核對情境，不能當成保證成交目標或獲利機率。');
  if(financial)out.reasons.push('金融業使用盈餘與權益；未核對監管資本、呆帳及實際配息能力，仍須個別研究。');
  if(!input.sector)out.reasons.push('產業尚未核對，不列入首頁入場候選。');
  return out;
}
