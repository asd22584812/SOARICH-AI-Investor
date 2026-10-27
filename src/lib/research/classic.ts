import { sourceJson } from "./official";
import { TW_QUOTES, TW_RATIOS, numeric, rocDate, type Row } from "./taiwan";
import type { EntryValuation } from "./pricing";

export interface ClassicModel {
  name: string;
  fair: number | null;
  low: number | null;
  high: number | null;
  formula: string;
  note: string;
  sourceUrl: string;
}

interface HistoryReply {
  date?: string;
  stat?: string;
  fields?: string[];
  data?: unknown[][];
}

interface RatioPoint {
  date: string;
  year: number;
  pe: number | null;
  pb: number | null;
}

interface Band {
  cheap: number;
  fair: number;
  expensive: number;
}

/** 排除獲利崩壞時的極端本益比，避免中位數被灌爆 */
const PE_SAMPLE_CAP = 40;
const MAX_FAIR_VS_PRICE = 2.5;

const mean = (v: number[]) =>
  v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;

function bandFromRange(
  lowMultiple: number,
  highMultiple: number,
  perShare: number
): Band | null {
  if (
    !(perShare > 0) ||
    !(lowMultiple > 0) ||
    !(highMultiple > 0) ||
    highMultiple < lowMultiple
  ) {
    return null;
  }
  const span = highMultiple - lowMultiple;
  const q = span / 4;
  return {
    // Yahoo VIP：最高～最低切四等分；最低那等分＝便宜，最高＝昂貴
    cheap: perShare * (lowMultiple + q),
    fair: perShare * (lowMultiple + 2 * q),
    expensive: perShare * (highMultiple - q),
  };
}

/** 圖一・股價淨值比：五年高低 PB 切四等分 */
export function yahooVipPbBand(
  bookValue: number,
  pbSamples: number[]
): Band | null {
  const vals = pbSamples.filter((x) => Number.isFinite(x) && x > 0);
  if (vals.length < 24) return null;
  return bandFromRange(Math.min(...vals), Math.max(...vals), bookValue);
}

/**
 * 圖一・本益比：先算每年最高／最低本益比，再取五年平均高低，切四等分。
 * 樣本本益比超過 PE_SAMPLE_CAP 視為獲利異常，不納入年度高低。
 */
export function yahooVipPeBand(
  eps: number,
  points: { year: number; pe: number }[]
): Band | null {
  if (!(eps > 0) || points.length < 12) return null;
  const byYear = new Map<number, number[]>();
  for (const p of points) {
    if (!(p.pe > 0) || p.pe > PE_SAMPLE_CAP) continue;
    const list = byYear.get(p.year) ?? [];
    list.push(p.pe);
    byYear.set(p.year, list);
  }
  const annualHigh: number[] = [];
  const annualLow: number[] = [];
  for (const samples of byYear.values()) {
    if (samples.length < 2) continue;
    annualHigh.push(Math.max(...samples));
    annualLow.push(Math.min(...samples));
  }
  if (annualHigh.length < 3) return null;
  const avgHigh = mean(annualHigh);
  const avgLow = mean(annualLow);
  if (avgHigh == null || avgLow == null) return null;
  return bandFromRange(avgLow, avgHigh, eps);
}

/** 圖一・現金股利：殖利率 >5% 便宜、3～5% 合理、<3% 昂貴 */
export function yahooVipDividendBand(dividendPerShare: number): Band | null {
  if (!(dividendPerShare >= 0.1)) return null;
  return {
    cheap: dividendPerShare / 0.05,
    fair: dividendPerShare / 0.04,
    expensive: dividendPerShare / 0.03,
  };
}

function medianOf(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 綜合挑選：
 * 1. 合理價不可超過現價 2.5 倍（擋天價）
 * 2. 股利法若暗示要大跌超過五成才「合理」，不納入綜合（仍可在 models 顯示）
 * 3. 最終合理價／便宜價／昂貴價 = 可用方法的中位數
 */
function pickReference(
  bands: { name: string; band: Band; note: string; formula: string }[],
  price: number
): { name: string; band: Band; note: string; formula: string } | null {
  const sane = bands.filter((b) => {
    if (!(b.band.fair > 0) || !(b.band.cheap > 0)) return false;
    if (b.band.fair > price * MAX_FAIR_VS_PRICE) return false;
    // 股利法：殖利率極低時「合理價」會遠低於現價，不適合作唯一估值參考
    if (b.name.includes("現金股利") && b.band.fair < price * 0.5) return false;
    return true;
  });
  if (!sane.length) return null;

  const fair = medianOf(sane.map((b) => b.band.fair));
  const cheap = medianOf(sane.map((b) => b.band.cheap));
  const expensive = medianOf(sane.map((b) => b.band.expensive));
  if (fair == null || cheap == null || expensive == null) return null;

  return {
    name: `Yahoo VIP 綜合（${sane.map((b) => b.name.split("（")[0]).join(" + ")}）`,
    band: {
      cheap: Math.min(cheap, fair),
      fair,
      expensive: Math.max(expensive, fair),
    },
    note: `採用 ${sane.length} 種通過合理性檢查的方法取中位數。完整三法細節見下方模型列表。`,
    formula: sane.map((b) => b.formula).join("；"),
  };
}

let historyCache:
  | {
      until: number;
      promise: Promise<Map<string, RatioPoint[]>>;
    }
  | undefined;

/** 盡量取近五年月末工作日的官方本益比／淨值比 */
async function history(): Promise<Map<string, RatioPoint[]>> {
  if (historyCache && historyCache.until > Date.now()) {
    return historyCache.promise;
  }
  const promise = (async () => {
    const dates = Array.from({ length: 60 }, (_, i) => {
      const now = new Date();
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 0)
      );
      while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
        d.setUTCDate(d.getUTCDate() - 1);
      }
      return d.toISOString().slice(0, 10).replaceAll("-", "");
    });
    const replies = await Promise.allSettled(
      dates.map((date) =>
        sourceJson<HistoryReply>(
          `https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&date=${date}&selectType=ALL`,
          86400000
        )
      )
    );
    const map = new Map<string, RatioPoint[]>();
    for (const [index, r] of replies.entries()) {
      if (
        r.status !== "fulfilled" ||
        r.value.stat !== "OK" ||
        r.value.date !== dates[index] ||
        !r.value.fields ||
        !r.value.data
      ) {
        continue;
      }
      const f = r.value.fields;
      const code = f.indexOf("證券代號");
      const pe = f.indexOf("本益比");
      const pb = f.indexOf("股價淨值比");
      if (code < 0 || pe < 0 || pb < 0) continue;
      const iso = `${dates[index].slice(0, 4)}-${dates[index].slice(4, 6)}-${dates[index].slice(6, 8)}`;
      const year = Number(dates[index].slice(0, 4));
      for (const row of r.value.data) {
        const s = String(row[code]);
        const list = map.get(s) ?? [];
        list.push({
          date: iso,
          year,
          pe: numeric(row[pe]),
          pb: numeric(row[pb]),
        });
        map.set(s, list);
      }
    }
    return map;
  })();
  historyCache = { until: Date.now() + 86400000, promise };
  return promise;
}

/**
 * 台股估價：採用 Yahoo VIP 模式（圖一）
 * - PB 五年高低四等分
 * - PE 五年「年均高低」四等分（並排除極端本益比）
 * - 現金股利殖利率 3%／5% 門檻
 * 不再使用「歷史 PE 中位數 × 今日 EPS」（會把獲利谷底月份灌成數百倍合理價）。
 */
export async function classicTaiwan(
  symbol: string,
  price: number,
  quoteDate: string | null,
  base: EntryValuation,
  industry: string | null
): Promise<EntryValuation> {
  const [quotes, ratios, past] = await Promise.all([
    sourceJson<Row[]>(TW_QUOTES, 300000),
    sourceJson<Row[]>(TW_RATIOS, 300000),
    history(),
  ]);
  const q = quotes.find((row) => row.Code === symbol);
  const r = ratios.find((row) => row.Code === symbol);
  const h = past.get(symbol) ?? [];

  if (
    !quoteDate ||
    Date.now() - Date.parse(quoteDate) > 7 * 86400000 ||
    Date.parse(quoteDate) > Date.now() + 86400000
  ) {
    return base;
  }
  if (
    !q ||
    !r ||
    q.Date !== r.Date ||
    rocDate(q.Date) !== quoteDate ||
    numeric(q.ClosingPrice) !== price
  ) {
    return base;
  }

  const pe = numeric(r.PEratio);
  const pb = numeric(r.PBratio);
  const yieldPct = numeric(r.DividendYield);

  // 優先用已核對的財報 EPS／淨值；缺值才用官方本益比／淨值比反推
  const epsFromStatements =
    base.normalizedEps != null && base.normalizedEps > 0
      ? base.normalizedEps
      : null;
  const epsFromRatio = pe && pe > 0 ? price / pe : null;
  const eps = epsFromStatements ?? epsFromRatio;

  // 每股淨值：用現價／官方 PB（與交易所口徑一致）；並與過高反推值做防護
  let bookValue = pb && pb > 0 ? price / pb : null;
  if (bookValue != null && bookValue > price * 8) {
    // 當日 PB 異常偏低會灌爆淨值 → 放棄反推
    bookValue = null;
  }

  const dividend =
    yieldPct != null && yieldPct > 0 ? (price * yieldPct) / 100 : null;

  const pbSamples = h
    .map((p) => p.pb)
    .filter((x): x is number => x != null && x > 0);
  const pePoints = h
    .filter((p): p is RatioPoint & { pe: number } => p.pe != null && p.pe > 0)
    .map((p) => ({ year: p.year, pe: p.pe }));

  const pbBand = bookValue != null ? yahooVipPbBand(bookValue, pbSamples) : null;
  const peBand = eps != null ? yahooVipPeBand(eps, pePoints) : null;
  const divBand = dividend != null ? yahooVipDividendBand(dividend) : null;

  const models: ClassicModel[] = [
    {
      name: "股價淨值比評估（Yahoo VIP 五年四等分）",
      fair: pbBand?.fair ?? null,
      low: pbBand?.cheap ?? null,
      high: pbBand?.expensive ?? null,
      formula: bookValue
        ? `每股淨值 ${bookValue.toFixed(2)} × 五年 PB 四等分中位倍數`
        : "缺淨值",
      note: `有效 PB 樣本 ${pbSamples.length} 筆月末資料；上市未滿五年或樣本不足則不計算。適用各產業。`,
      sourceUrl: TW_RATIOS,
    },
    {
      name: "本益比評估（Yahoo VIP 五年年均高低四等分）",
      fair: peBand?.fair ?? null,
      low: peBand?.cheap ?? null,
      high: peBand?.expensive ?? null,
      formula: eps
        ? `EPS ${eps.toFixed(2)} × 五年平均高低本益比四等分中位`
        : "缺 EPS",
      note: `已排除本益比 > ${PE_SAMPLE_CAP} 的異常月份（獲利谷底會灌爆倍數）。任一年虧損／EPS 為負則此法參考性下降。產業：${industry ?? "未標示"}`,
      sourceUrl: TW_RATIOS,
    },
    {
      name: "現金股利評估（殖利率 3%／5%）",
      fair: divBand?.fair ?? null,
      low: divBand?.cheap ?? null,
      high: divBand?.expensive ?? null,
      formula: dividend
        ? `近況現金股利約 ${dividend.toFixed(2)}；便宜=股利÷5%，合理=÷4%，昂貴=÷3%`
        : "缺股利",
      note: "五年皆有配息且單年股利≥0.1 元才具完整參考性；此處先用交易所公布殖利率反推當期股利。",
      sourceUrl: TW_RATIOS,
    },
  ];

  const candidates: {
    name: string;
    band: Band;
    note: string;
    formula: string;
  }[] = [];
  if (pbBand) {
    candidates.push({
      name: models[0].name,
      band: pbBand,
      note: models[0].note,
      formula: models[0].formula,
    });
  }
  if (peBand) {
    candidates.push({
      name: models[1].name,
      band: peBand,
      note: models[1].note,
      formula: models[1].formula,
    });
  }
  if (divBand) {
    candidates.push({
      name: models[2].name,
      band: divBand,
      note: models[2].note,
      formula: models[2].formula,
    });
  }

  const selected = pickReference(candidates, price);
  if (!selected) {
    // 歷史法全部不合理時：若底層盈餘模型可用且未爆炸，保留它；否則標示無法估價
    if (
      base.status === "available" &&
      base.fair != null &&
      base.fair > 0 &&
      base.fair <= price * MAX_FAIR_VS_PRICE
    ) {
      return {
        ...base,
        models,
        reasons: [
          ...base.reasons,
          "Yahoo VIP 歷史倍數法無法得出合理區間，已改回財報盈餘模型（並限制不合理倍數）。",
        ],
      };
    }
    return {
      ...base,
      models,
      status: "unavailable",
      eligible: false,
      fair: null,
      entry: null,
      low: null,
      high: null,
      margin: null,
      signal: "歷史估價無法得出合理區間",
      reasons: [
        "無法用 Yahoo VIP（PB／PE／股利）得出與現價相符的合理價；已拒絕誇大估值，避免出現遠高於歷史股價的數字。",
      ],
    };
  }

  const fair = selected.band.fair;
  const entry = selected.band.cheap;
  const expensive = selected.band.expensive;

  return {
    ...base,
    models,
    status: "available",
    method: selected.name,
    fair,
    entry,
    low: entry,
    high: expensive,
    margin: ((fair - price) / fair) * 100,
    eligible: price <= entry,
    signal:
      price <= entry
        ? "價格落在便宜價區間（可列研究）"
        : price <= fair
          ? "接近合理價"
          : price >= expensive
            ? "落在昂貴價區間"
            : "高於合理價，先觀望",
    scenarios: undefined,
    formulas: [
      selected.formula,
      "便宜價／合理價／昂貴價依 Yahoo VIP：五年倍數高低切四等分（股利法則用 5%／4%／3% 殖利率反推）。",
      "保守買點＝便宜價上緣；安全邊際＝(合理價 − 現價) ÷ 合理價。",
      `合理性防護：合理價不得超過現價的 ${MAX_FAIR_VS_PRICE} 倍，並排除極端本益比樣本。`,
    ],
    reasons: [
      "台股估價改採 Yahoo VIP 歷史區間法，不再使用「歷史本益比中位數 × 今日 EPS」。",
      selected.note,
      "此為估值參考，不是保證買點或獲利機率。",
    ],
  };
}
