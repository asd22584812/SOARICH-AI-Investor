import {sourceJson} from './official';
import {TW_QUOTES,TW_RATIOS,numeric,rocDate,type Row} from './taiwan';
import type {EntryValuation} from './pricing';
export interface ClassicModel {name:string;fair:number|null;low:number|null;high:number|null;formula:string;note:string;sourceUrl:string}
interface HistoryReply {date?:string;stat?:string;fields?:string[];data?:unknown[][]}
const median=(v:number[])=>{const s=v.slice().sort((a,b)=>a-b);return s.length?s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2:null;};
export function historicalMultiple(values:(number|null)[]):number|null {const v=values.filter((x):x is number=>x!=null&&Number.isFinite(x)&&x>0);return v.length>=24?median(v):null;}
let historyCache:{until:number;promise:Promise<Map<string,{pe:(number|null)[];pb:(number|null)[]}>>}|undefined;
async function history(){
 if(historyCache&&historyCache.until>Date.now())return historyCache.promise;
 const promise=(async()=>{
  const dates=Array.from({length:36},(_,i)=>{const now=new Date();const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,0));while(d.getUTCDay()===0||d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10).replaceAll('-','');});
  const replies=await Promise.allSettled(dates.map(date=>sourceJson<HistoryReply>(`https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&date=${date}&selectType=ALL`,86400000)));
  const map=new Map<string,{pe:(number|null)[];pb:(number|null)[]}>();
  for(const [index,r] of replies.entries()){if(r.status!=='fulfilled'||r.value.stat!=='OK'||r.value.date!==dates[index]||!r.value.fields||!r.value.data)continue;const f=r.value.fields;const code=f.indexOf('證券代號'),pe=f.indexOf('本益比'),pb=f.indexOf('股價淨值比');if(code<0||pe<0||pb<0)continue;for(const row of r.value.data){const s=String(row[code]);const v=map.get(s)??{pe:[],pb:[]};v.pe.push(numeric(row[pe]));v.pb.push(numeric(row[pb]));map.set(s,v);}}
  return map;
 })();
 historyCache={until:Date.now()+86400000,promise};return promise;
}
export async function classicTaiwan(symbol:string,price:number,quoteDate:string|null,base:EntryValuation,industry:string|null):Promise<EntryValuation>{
 const [quotes,ratios,past]=await Promise.all([sourceJson<Row[]>(TW_QUOTES,300000),sourceJson<Row[]>(TW_RATIOS,300000),history()]);
 const q=quotes.find(q=>q.Code===symbol),r=ratios.find(r=>r.Code===symbol),h=past.get(symbol);
 if(!quoteDate || Date.now()-Date.parse(quoteDate)>7*86400000 || Date.parse(quoteDate)>Date.now()+86400000)return base;
 if(!q||!r||q.Date!==r.Date||rocDate(q.Date)!==quoteDate||numeric(q.ClosingPrice)!==price)return base;
 const pe=numeric(r.PEratio),pb=numeric(r.PBratio),yieldPct=numeric(r.DividendYield);
 const eps=pe&&pe>0?price/pe:null,bv=pb&&pb>0?price/pb:null,dividend=yieldPct&&yieldPct>0?price*yieldPct/100:null;
 const peMedian=historicalMultiple(h?.pe??[]),pbMedian=historicalMultiple(h?.pb??[]);
 const models:ClassicModel[]=[
  {name:'歷史本益比法（TTM）',fair:eps!=null&&peMedian!=null?eps*peMedian:null,low:null,high:null,formula:`交易所 TTM EPS 約 ${eps?.toFixed(4)??'缺值'} × 歷史 P/E 中位數 ${peMedian?.toFixed(2)??'不足'}`,note:`近 36 個月月末工作日抽樣，有效正 P/E ${h?.pe.filter(x=>x!=null&&x>0).length??0} 筆，至少需 24 筆；非每日河流圖。EPS 由同日收盤價 ÷ 官方 P/E 反推，有四捨五入誤差；不是法人預估 EPS。`,sourceUrl:TW_RATIOS},
  {name:'歷史股價淨值比法',fair:bv!=null&&pbMedian!=null?bv*pbMedian:null,low:null,high:null,formula:`每股淨值約 ${bv?.toFixed(4)??'缺值'} × 歷史 P/B 中位數 ${pbMedian?.toFixed(2)??'不足'}`,note:`有效正 P/B ${h?.pb.filter(x=>x!=null&&x>0).length??0} 筆月末工作日樣本，至少需 24 筆。淨值由同日收盤價 ÷ 官方 P/B 反推；資產減損與產業轉折仍須另查。`,sourceUrl:TW_RATIOS},
  {name:'現金殖利率法（股利維持情境）',fair:dividend!=null?dividend/.05:null,low:dividend!=null?dividend/.06:null,high:dividend!=null?dividend/.04:null,formula:`來源股利約 ${dividend?.toFixed(4)??'缺值'} ÷ 5%（另列 6%／4%）`,note:`股利年度 ${r.DividendYear??'依來源'}；由官方殖利率 × 同日股價反推，不是近年平均或未來配息承諾。未驗證配息穩定，不作首頁推薦依據。`,sourceUrl:TW_RATIOS},
  {name:'高登股利折現法',fair:null,low:null,high:null,formula:'明年股利 ÷ (要求報酬率 − 長期股利成長率)',note:'尚無已核對的明年股利與長期成長預測；不能用歷史高成長直接代入。必須要求報酬率 > 長期成長率。',sourceUrl:TW_RATIOS},
 ];
 const cyclical=/steel|shipping|marine|building|construction|real estate|memory|panel|electronic components|capital markets|banks|insurance|金融|銀行/i.test(industry??'');
 const selected=cyclical?models[1]:models[0].fair!=null?models[0]:models[1];
 if(selected.fair==null)return {...base,models};
 const fair=selected.fair,entry=fair*.85;
 return {...base,models,status:'available',method:selected.name,fair,entry,low:entry,high:null,margin:(fair-price)/fair*100,eligible:price<=entry,signal:price<=entry?'價格符合買入評估區':price<fair?'低於合理價，尚未達保守買點':'高於估值參考，先觀望',scenarios:undefined,formulas:[selected.formula,'保守買點 = 估值參考 × 85%；折價 = (估值參考 − 現價) ÷ 估值參考。'],reasons:['這是公司歷史市場倍數的估值參考，不能單獨證明內在價值或適合買入。',selected.note]};
}
