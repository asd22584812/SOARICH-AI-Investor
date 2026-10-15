import type { OfficialFinancials } from "@/lib/research/official";
import type { ScenarioResult } from "@/lib/research/scenarios";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";
export function OfficialFinancialsSection({ data, scenario }: { data: OfficialFinancials; scenario?: ScenarioResult }) {
  return <>
    <section className="glass-card rounded-3xl p-5 space-y-3">
      <h2 className="font-semibold">官方財報 · {data.provider}</h2>
      <p className="text-xs text-text-secondary">{data.unit}。最新財報期間：{data.latestPeriod ?? "未提供"}；最近申報日：{data.publishedOn ?? "資料集未提供"}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right whitespace-nowrap">
          <caption className="text-left mb-2 text-text-secondary">{data.provider === "SEC" ? "年度財報（最新年度在上）" : "年初至今累計損益；不可視為全年"}</caption>
          <thead><tr>{["期間／申報", "營收", "淨利", "EPS", "營業現金流", "設備投資", "FCF"].map(t => <th key={t} scope="col" className="p-2">{t}</th>)}</tr></thead>
          <tbody>{data.years.slice().reverse().map(y => <tr key={`${y.start}/${y.end}`} className="border-t border-white/10">
            <th scope="row" className="p-2 font-normal text-left"><a className="text-brand underline" href={y.sourceUrl} target="_blank" rel="noopener noreferrer">{y.start}～{y.end}</a>{y.filed && <p className="text-text-secondary">申報 {y.filed}</p>}</th>
            {[y.revenue,y.netIncome,y.eps,y.operatingCashflow,y.capex,y.freeCashflow].map((v,i) => <td key={i} className="p-2">{v == null ? "未提供" : i===2 ? v.toFixed(2) : formatCompactNumber(v)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {data.notes.map(note => <p key={note} className="text-xs text-text-secondary">{note}</p>)}
      <a className="block text-sm text-brand underline" href={data.sourceUrl} target="_blank" rel="noopener noreferrer">核對官方原始資料</a>
    </section>
    <section className="glass-card rounded-3xl p-5 space-y-3">
      <h2 className="font-semibold">現金流估值情境</h2>
      {scenario?.status === "available" ? <>
        <p className="text-xs text-text-secondary">{scenario.basis}</p>
        <p className="text-xs text-text-secondary">基期 FCF：{formatCompactNumber(scenario.baseCashflow)} USD；股數：{formatCompactNumber(scenario.shares)} 股（{data.shares?.asOf}）。</p>
        {scenario.scenarios.map(s => <div key={s.label} className="rounded-xl bg-white/5 p-3">
          <p>{s.label}：<strong className="text-brand">{formatCurrency(s.value,"USD")}</strong></p>
          <p className="text-xs text-text-secondary">前五年成長 {(s.growth*100).toFixed(1)}% · 折現 {(s.discount*100).toFixed(1)}% · 永續成長 {(s.terminalGrowth*100).toFixed(1)}%</p>
        </div>)}
      </> : <p className="text-sm text-text-secondary">暫無法估值</p>}
      {(scenario?.reasons ?? ["缺少完整估值輸入。"]).map(reason => <p key={reason} className="text-xs text-text-secondary">{reason}</p>)}
    </section>
  </>;
}
