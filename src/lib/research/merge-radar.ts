import type { ResearchRadar } from './radar';
/** Replace observations by symbol so a retried batch cannot duplicate cards or counts. */
export function mergeRadar(previous:ResearchRadar|undefined,next:ResearchRadar):ResearchRadar {
 const candidates=new Map((previous?.candidates??[]).map(x=>[x.symbol,x]));
 const excluded=new Map((previous?.excluded??[]).map(x=>[x.symbol,x]));
 for(const x of next.excluded??[]){candidates.delete(x.symbol);excluded.set(x.symbol,x);}
 for(const x of next.candidates){excluded.delete(x.symbol);candidates.set(x.symbol,x);}
 return {...next,candidates:[...candidates.values()].sort((a,b)=>(b.margin??0)-(a.margin??0)),excluded:[...excluded.values()]};
}
