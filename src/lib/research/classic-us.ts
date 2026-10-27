import type { EntryValuation } from "./pricing";

/**
 * 美股課程估價（圖二／圖三）：
 * - 資產股：PB < 0.8 → 門檻價 = 每股淨值 × 0.8
 * - 股息股：殖利率 > 4% → 合理價 = 每股股息 ÷ 4%
 * - 成長／通用：PE < 12 → 門檻價 = EPS × 12
 *
 * 用於 Yahoo 盈餘折現模型不適用（負 FCF、ADR 幣別不一致等）時的備援，
 * 全部以「報價幣別 USD」的 Yahoo 報價欄位計算，避免把 BRL／GBP 財報直接當美元。
 */
export function classicUs(
  input: {
    price: number;
    currency: string;
    asOf: string | null;
    name: string;
    sector: string | null;
  },
  quote: {
    trailingEps: number | null;
    bookValue: number | null;
    dividendRate: number | null;
    dividendYield: number | null;
    trailingPE: number | null;
    priceToBook: number | null;
  }
): EntryValuation {
  const out: EntryValuation = {
    status: "unavailable",
    method: "美股課程門檻估值（PE12 / PB0.8 / 殖利率4%）",
    reasons: [],
    fair: null,
    low: null,
    high: null,
    entry: null,
    margin: null,
    eligible: false,
    signal: "資料不足",
    normalizedEps: quote.trailingEps,
    normalizedFcfPerShare: null,
    shares: null,
    period: input.asOf,
    formulas: [],
    metrics: [],
    guide: [],
  };

  if (input.currency !== "USD") {
    out.reasons.push("報價幣別不是 USD，略過美股課程估值。");
    return out;
  }
  if (!(input.price > 0)) {
    out.reasons.push("現價無效。");
    return out;
  }

  const eps = quote.trailingEps != null && quote.trailingEps > 0 ? quote.trailingEps : null;
  const book = quote.bookValue != null && quote.bookValue > 0 ? quote.bookValue : null;
  const dividend =
    quote.dividendRate != null && quote.dividendRate >= 0.01
      ? quote.dividendRate
      : quote.dividendYield != null && quote.dividendYield > 0
        ? (input.price * quote.dividendYield) / (quote.dividendYield > 1 ? 100 : 1)
        : null;

  const pe12 = eps != null ? eps * 12 : null;
  const pb08 = book != null ? book * 0.8 : null;
  const pbFair = book != null ? book * 1.0 : null;
  const divFair = dividend != null ? dividend / 0.04 : null;
  const divCheap = dividend != null ? dividend / 0.05 : null;

  out.guide = [
    {
      label: "攻略 P/E = 12 門檻價",
      result: pe12 != null ? "可計算" : "缺 EPS",
      price: pe12,
      note: "TTM EPS × 12（美股課程成長股門檻）",
    },
    {
      label: "攻略 P/B = 0.8 門檻價",
      result: pb08 != null ? "可計算" : "缺淨值",
      price: pb08,
      note: "每股帳面價值 × 0.8（資產股便宜門檻）",
    },
    {
      label: "股息殖利率 4% 合理價",
      result: divFair != null ? "可計算" : "缺股息",
      price: divFair,
      note: "每股年度股息 ÷ 4%",
    },
  ];

  // 課程精神：任一法達標即可視為「有研究價值」
  // - 成長／通用：現價 ≤ EPS×12（即 PE≤12）
  // - 資產股：現價 ≤ 淨值×0.8（便宜）或 ≤ 淨值（接近合理）
  // - 股息股：現價 ≤ 股息÷4%（即殖利率≥4%）
  const fairCandidates = [pe12, pbFair, divFair].filter(
    (v): v is number => v != null && Number.isFinite(v) && v > 0 && v <= input.price * 2.5
  );
  const entryCandidates = [pe12, pb08, divCheap].filter(
    (v): v is number => v != null && Number.isFinite(v) && v > 0 && v <= input.price * 2.5
  );

  if (!fairCandidates.length) {
    out.reasons.push(
      "無法用 PE×12／PB／股息法得出合理價（可能 EPS 為負、缺淨值，或結果遠高於現價）。"
    );
    return out;
  }

  // 合理價取「可用方法中最高者」：只要有一法顯示低估，排行榜就看得到
  const fair = Math.max(...fairCandidates);
  const entry = entryCandidates.length
    ? Math.min(Math.min(...entryCandidates), fair * 0.85)
    : fair * 0.85;

  const hitPe = pe12 != null && input.price <= pe12;
  const hitPb = pb08 != null && input.price <= pb08;
  const hitDiv = divFair != null && input.price <= divFair;
  const methodHits = [
    hitPe ? "PE≤12" : null,
    hitPb ? "PB≤0.8" : null,
    hitDiv ? "殖利率≥4%" : null,
  ].filter(Boolean);

  out.status = "available";
  out.fair = fair;
  out.entry = entry;
  out.low = entry;
  out.high = fair;
  out.margin = ((fair - input.price) / fair) * 100;
  out.eligible = !!input.sector && (hitPe || hitPb || hitDiv || input.price <= entry);
  out.signal =
    hitPe || hitPb || hitDiv
      ? `符合課程低估條件（${methodHits.join("、")}）`
      : input.price <= fair
        ? "接近課程合理價"
        : "高於課程合理價，先觀望";
  out.formulas = [
    eps != null ? `PE12 門檻 = EPS ${eps.toFixed(2)} × 12 = US$${pe12?.toFixed(2)}` : "PE12 不可用",
    book != null
      ? `PB0.8 門檻 = 淨值 ${book.toFixed(2)} × 0.8 = US$${pb08?.toFixed(2)}`
      : "PB0.8 不可用",
    dividend != null
      ? `股息合理價 = 股息 ${dividend.toFixed(2)} ÷ 4% = US$${divFair?.toFixed(2)}`
      : "股息法不可用",
    "綜合合理價取可用方法最高值（任一法達標即可列入研究）；保守買點取較低門檻。",
    "幣別：全部以 USD 報價欄位計算，不把外幣財報直接當美元。",
  ];
  out.reasons.push(
    "此為美股課程門檻估值（PE12／PB0.8／殖利率4%）。不是保證獲利。"
  );
  if (/real estate|reit/i.test(input.sector ?? "")) {
    out.reasons.push("REIT 以淨值／股息參考為主，未使用 FFO。");
  }
  if (!input.sector) {
    out.reasons.push("產業尚未核對，不列入首頁入場候選。");
    out.eligible = false;
  }
  return out;
}

export function quoteMetricsFromSummary(summary: unknown): {
  trailingEps: number | null;
  bookValue: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  trailingPE: number | null;
  priceToBook: number | null;
} {
  const s = summary as {
    defaultKeyStatistics?: Record<string, unknown>;
    summaryDetail?: Record<string, unknown>;
    financialData?: Record<string, unknown>;
  } | null;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const ks = s?.defaultKeyStatistics ?? {};
  const sd = s?.summaryDetail ?? {};
  return {
    trailingEps: num(ks.trailingEps) ?? num(ks.forwardEps),
    bookValue: num(ks.bookValue),
    dividendRate: num(sd.dividendRate) ?? num(ks.trailingAnnualDividendRate),
    dividendYield:
      num(sd.dividendYield) ?? num(ks.trailingAnnualDividendYield),
    trailingPE: num(sd.trailingPE) ?? num(ks.trailingPE),
    priceToBook: num(ks.priceToBook),
  };
}
