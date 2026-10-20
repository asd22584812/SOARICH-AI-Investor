import type { StockResearchReport } from '@/types/stock';
const num=(n:number|null|undefined)=>n==null?'未提供':n.toLocaleString('zh-TW',{maximumFractionDigits:2});
export function EntryResearch({report:r}:{report:StockResearchReport}){
 const v=r.entryValuation,e=r.statements,c=r.company;
 const money=(n:number|null|undefined)=>n==null?'未計算':`${r.currency==='TWD'?'NT$':'US$'}${num(n)}`;
 return <>
 <section className="glass-card rounded-3xl p-5 space-y-4">
  <h2 className="text-xl font-semibold text-brand">{v?.signal??'財報來源尚未取得'}</h2>
  {v?.status==='available' && <>
   <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-text-secondary">有安全邊際的入場上限</p><strong className="text-xl">{money(v.entry)}</strong></div><div><p className="text-sm text-text-secondary">模型合理價（基準情境）</p><strong className="text-xl">{money(v.fair)}</strong></div></div>
   <p>估值情境區間：{money(v.low)}～{money(v.high)}</p>
   <p>現價：{money(r.price)} · 相對基準安全邊際：{num(v.margin)}%</p>
   <p className="text-sm">方法：{v.method}。價格由財報與下列假設計算；不是分析師共識目標價。</p>
   <div className="grid grid-cols-3 gap-2">{v.scenarios?.map(s=><div key={s.label} className="rounded-xl bg-white/5 p-3"><p className="text-sm">{s.label}</p><strong>{money(s.value)}</strong><p className="text-xs text-text-secondary">前五年成長 {(s.growth*100).toFixed(1)}%<br/>折現率 {(s.discount*100).toFixed(0)}%<br/>終值成長 {(s.terminalGrowth*100).toFixed(0)}%</p></div>)}</div>
   <details className="text-sm space-y-2"><summary className="cursor-pointer text-brand">展開公式與實際輸入數字</summary><p>估值每股盈餘：{money(v.normalizedEps)}／股；TTM FCF：{money(v.normalizedFcfPerShare)}／股；普通股數：{num(v.shares)}</p>{v.formulas.map(x=><p key={x}>{x}</p>)}</details>
  </>}
  {(v?.reasons??r.valuationReasons).map(x=><p key={x} className="text-sm text-text-secondary">{x}</p>)}
 </section>
 {v?.guide && <section className="glass-card rounded-3xl p-5 space-y-4"><h2 className="text-lg font-semibold">你的價值投資攻略 · 財報檢核</h2><p className="text-sm text-text-secondary">門檻價與模型合理價分開看；不將缺資料算成通過，也不合成巴菲特評分。</p>{v.guide.map(g=><div key={g.label} className="border-t border-white/10 pt-3"><div className="flex justify-between gap-3"><strong className="text-sm">{g.label}</strong><span className="text-brand text-sm">{g.price!=null?money(g.price):g.result}</span></div><p className="mt-1 text-xs text-text-secondary">{g.note}</p></div>)}<a className="text-brand underline text-xs" href="https://pages.stern.nyu.edu/~adamodar/New_Home_Page/invfables/peratio.htm" target="_blank" rel="noreferrer">估值方法參考：NYU — 本益比與成長、配發能力及風險</a></section>}
 {e && <section className="glass-card rounded-3xl p-5 space-y-4">
  <h2 className="text-lg font-semibold">財報明細與重新計算的指標</h2>
  <p className="text-sm">來源：{e.provider} · 財報幣別：{e.currency??'未確認'} · {v?.period??'期間尚不足以加總四季'}</p>
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{v?.metrics.map(m=><div key={m.label} className="rounded-xl bg-white/5 p-3"><p className="text-xs text-text-secondary">{m.label}</p><p className="font-semibold break-all">{num(m.value)} {m.value==null?'':m.unit}</p><p className="mt-1 text-xs text-text-secondary">{m.formula}</p></div>)}</div>
  {(['annual','quarterly'] as const).map(kind=><details key={kind} open={kind==='annual'}><summary className="cursor-pointer font-semibold">{kind==='annual'?'年度財報（12 個月）':'單季財報（3 個月，非年初累計）'}</summary><div className="overflow-x-auto py-3"><table className="text-xs whitespace-nowrap w-full"><thead><tr>{['期末','營收','股東淨利','EPS','營業現金流','資本支出','自由現金流'].map(h=><th key={h} className="p-2 text-right">{h}</th>)}</tr></thead><tbody>{e[kind].slice().reverse().map(row=><tr key={row.end} className="border-t border-white/10">{[row.end,num(row.revenue),num(row.income),row.eps==null?'未提供':num(row.eps)+(row.epsBasis==='basic'?'（基本）':row.epsBasis==='diluted'?'（稀釋）':''),num(row.ocf),num(row.capex),num(row.fcf)].map((x,i)=><td key={i} className="p-2 text-right">{x}</td>)}</tr>)}</tbody></table></div><p className="text-xs text-text-secondary">金額以 {e.currency??'來源未提供幣別'} 元呈現，EPS 為每股金額；缺值保留，不以零補齊。</p></details>)}
  {e.warnings.map(x=><p key={x} className="text-xs text-text-secondary">{x}</p>)}
  <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="text-brand underline text-sm">核對 Yahoo 財報來源</a>
 </section>}
 {c && <section className="glass-card rounded-3xl p-5 space-y-3"><h2 className="text-lg font-semibold">公司與經營資訊</h2><p>{c.sector??'產業未提供'} · {c.industry??'細項未提供'}</p>{c.description && <details><summary className="cursor-pointer">業務介紹（來源原文）</summary><p className="text-sm mt-2">{c.description}</p><a href={c.descriptionSourceUrl??c.sourceUrl} target="_blank" rel="noreferrer" className="text-brand underline text-sm">業務介紹來源</a></details>}<ul className="text-sm space-y-2">{c.people.map((p,i)=><li key={i}>{p.title}：{p.name}</li>)}</ul><p className="text-xs text-text-secondary">公司名錄資料日期：{c.asOf??'來源未標示，須再核對'}。姓名與職稱不等於管理能力評分；未有證據的護城河或接班風險不評分。</p><a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-brand underline text-sm">公司資料來源</a>{c.website && /^https?:\/\//i.test(c.website) && <a href={c.website} target="_blank" rel="noreferrer" className="block text-brand underline text-sm">公司官網</a>}</section>}
 </>;
}
