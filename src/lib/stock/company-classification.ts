import type {
  ClassificationScores,
  CompanyClassification,
  NormalizedFinancialData,
} from "./normalizer";

const FINANCIAL_PATTERN =
  /financial|bank|insurance|capital market|credit|mortgage|reit|broker|asset management|holding compan|金控|銀行|保險|金融|證券|壽險/i;
const CYCLICAL_PATTERN =
  /steel|mining|oil|gas|energy|chemical|material|auto|automotive|construction|shipping|airline|cement|paper|commodity|electronic component|passive component|passive|capacitor|resistor|industrial conglomerate|contract manufactur|container|freight|metals|lumber|building product|consumer electronics|computer hardware|electrical equipment/i;
const TECH_GROWTH_PATTERN =
  /semiconductor|software|technology|internet|platform|cloud|chip|ai infrastructure|saas|renewable|solar|data processing|search engine|social media/i;

const TIE_BREAK_ORDER: CompanyClassification[] = [
  "quality_compounder",
  "cyclical",
  "value",
  "growth",
  "financial",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface ClassificationResult {
  classification: CompanyClassification;
  scores: ClassificationScores;
  reasons: string[];
}

export interface PeReliabilityResult {
  unreliable: boolean;
  highRisk: boolean;
}

function scoreGrowth(data: NormalizedFinancialData): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const growth = data.revenueGrowth ?? 0;
  const earningsGrowth = data.earningsGrowth ?? 0;
  const pe = data.pe.value ?? 0;
  const grossMargin = data.grossMargin ?? 0;
  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`.toLowerCase();
  const marketCap = data.marketCap ?? 0;

  if (growth > 20) {
    score += 28;
    reasons.push(`營收成長 ${growth.toFixed(1)}% > 20%`);
  } else if (growth > 15) {
    score += 16;
  } else if (growth > 10) {
    score += 6;
  }

  if (earningsGrowth > 20) {
    score += 22;
    reasons.push(`盈餘成長 ${earningsGrowth.toFixed(1)}% > 20%`);
  } else if (earningsGrowth > 15) {
    score += 10;
  }

  if (TECH_GROWTH_PATTERN.test(industryText) && !CYCLICAL_PATTERN.test(industryText)) {
    score += 18;
    reasons.push("高成長科技產業");
  }

  if (grossMargin > 0 && grossMargin < 30) score -= 18;
  if (CYCLICAL_PATTERN.test(industryText) && growth > 15) score -= 12;

  if (pe >= 30 && growth > 15) {
    score += 12;
    reasons.push("高 PE 有成長支撐");
  }

  if (growth > 35) score += 10;

  if (growth < 10 && marketCap >= 200_000_000_000) score -= 18;
  if (growth >= 5 && growth <= 20) score -= 10;

  return { score: clamp(score, 0, 100), reasons };
}

function scoreQuality(data: NormalizedFinancialData): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const roe = data.roe ?? 0;
  const opMargin = data.operatingMargin ?? 0;
  const grossMargin = data.grossMargin ?? 0;
  const growth = data.revenueGrowth ?? 0;
  const pe = data.pe.value ?? 0;
  const marketCap = data.marketCap ?? 0;
  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`.toLowerCase();

  if (roe > 20) {
    score += 22;
    reasons.push(`ROE ${roe.toFixed(1)}% > 20%`);
  } else if (roe > 15) {
    score += 12;
  }

  if (opMargin > 25) {
    score += 22;
    reasons.push(`營業利益率 ${opMargin.toFixed(1)}% > 25%`);
  } else if (opMargin > 15) {
    score += 10;
  }

  if (grossMargin > 40) {
    score += 18;
    reasons.push(`毛利率 ${grossMargin.toFixed(1)}% > 40%`);
  } else if (grossMargin > 30) {
    score += 8;
  }

  if (growth >= 5 && growth <= 20) {
    score += 20;
    reasons.push(`穩健成長 ${growth.toFixed(1)}%`);
  } else if (growth > 20 && growth <= 35) {
    score += 8;
  }

  if (pe > 0 && pe <= 50) score += 8;
  if (marketCap >= 200_000_000_000) {
    score += 18;
    reasons.push("Mega Cap");
  } else if (marketCap >= 50_000_000_000) {
    score += 10;
  }

  if (opMargin > 12 && roe > 15) {
    score += 10;
    reasons.push("穩定獲利");
  }

  if (CYCLICAL_PATTERN.test(industryText)) score -= 22;
  if (/electronic component|passive|capacitor|resistor|mlcc/i.test(industryText)) {
    score -= 18;
  }

  if (growth > 35) score -= 6;

  return { score: clamp(score, 0, 100), reasons };
}

function scoreCyclical(data: NormalizedFinancialData): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`.toLowerCase();
  const grossMargin = data.grossMargin ?? 0;
  const growth = data.revenueGrowth ?? 0;
  const opMargin = data.operatingMargin ?? 0;

  if (CYCLICAL_PATTERN.test(industryText)) {
    score += 35;
    reasons.push("景氣循環產業");
  }

  if (/electronic component|passive|capacitor|resistor|mlcc/i.test(industryText)) {
    score += 25;
    reasons.push("電子零組件");
  }

  if (grossMargin > 0 && grossMargin < 25) {
    score += 12;
    reasons.push("毛利率偏低");
  }
  if (grossMargin > 0 && grossMargin < 15) score += 8;

  if (growth > 10 && grossMargin < 30) score += 15;
  if (growth > 18 && grossMargin < 35) score += 12;
  if (opMargin > 0 && opMargin < 12) score += 8;

  return { score: clamp(score, 0, 100), reasons };
}

function scoreFinancial(data: NormalizedFinancialData): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`.toLowerCase();
  const pe = data.pe.value ?? 0;
  const pb = data.pb.value ?? 0;

  if (FINANCIAL_PATTERN.test(industryText)) {
    score += 45;
    reasons.push("金融產業");
  }

  if (pe > 0 && pe < 20) score += 15;
  if (pb > 0 && pb < 2.5) score += 12;

  return { score: clamp(score, 0, 100), reasons };
}

function scoreValue(data: NormalizedFinancialData): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const pe = data.pe.value ?? 0;
  const pb = data.pb.value ?? 0;
  const growth = data.revenueGrowth ?? 0;
  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`.toLowerCase();

  if (pe > 0 && pe < 15) {
    score += 25;
    reasons.push(`低 PE ${pe.toFixed(1)}`);
  } else if (pe > 0 && pe < 20) {
    score += 12;
  }

  if (pb > 0 && pb < 1.5) {
    score += 20;
    reasons.push(`低 PB ${pb.toFixed(2)}`);
  } else if (pb > 0 && pb < 2.5) {
    score += 10;
  }

  if (growth < 8) {
    score += 18;
    reasons.push("低成長");
  } else if (growth < 12) {
    score += 8;
  }

  if (!TECH_GROWTH_PATTERN.test(industryText) && growth < 12) {
    score += 10;
    reasons.push("成熟產業");
  }

  return { score: clamp(score, 0, 100), reasons };
}

function pickWinner(
  entries: { classification: CompanyClassification; score: number; reasons: string[] }[],
  data: NormalizedFinancialData
): { classification: CompanyClassification; reasons: string[] } {
  const maxScore = Math.max(...entries.map((entry) => entry.score));
  const winners = entries.filter((entry) => entry.score === maxScore);
  const revenueGrowth = data.revenueGrowth ?? 0;

  if (revenueGrowth > 30) {
    const growthEntry = entries.find((entry) => entry.classification === "growth");
    if (growthEntry && growthEntry.score >= maxScore - 8) {
      return {
        classification: growthEntry.classification,
        reasons: growthEntry.reasons,
      };
    }
  }

  if (winners.length === 1) {
    return {
      classification: winners[0].classification,
      reasons: winners[0].reasons,
    };
  }

  for (const preferred of TIE_BREAK_ORDER) {
    const match = winners.find((entry) => entry.classification === preferred);
    if (match) {
      return { classification: match.classification, reasons: match.reasons };
    }
  }

  return {
    classification: winners[0].classification,
    reasons: winners[0].reasons,
  };
}

export function classifyCompanyWithScores(
  data: NormalizedFinancialData
): ClassificationResult {
  if (data.insufficientData) {
    return {
      classification: "insufficient_data",
      scores: {
        growthScore: 0,
        qualityScore: 0,
        valueScore: 0,
        financialScore: 0,
        cyclicalScore: 0,
      },
      reasons: ["關鍵財務資料不足"],
    };
  }

  const growth = scoreGrowth(data);
  const quality = scoreQuality(data);
  const value = scoreValue(data);
  const financial = scoreFinancial(data);
  const cyclical = scoreCyclical(data);

  const industryText = `${data.sector ?? ""} ${data.industry ?? ""}`;
  if (
    /金融|銀行|保險|金控|證券|壽險|financial|bank|insurance/i.test(
      industryText
    ) &&
    financial.score >= 40
  ) {
    return {
      classification: "financial",
      scores: {
        growthScore: growth.score,
        qualityScore: quality.score,
        valueScore: value.score,
        financialScore: financial.score,
        cyclicalScore: cyclical.score,
      },
      reasons: [...financial.reasons, "產業別優先判定為金融股"],
    };
  }

  const scores: ClassificationScores = {
    growthScore: growth.score,
    qualityScore: quality.score,
    valueScore: value.score,
    financialScore: financial.score,
    cyclicalScore: cyclical.score,
  };

  const winner = pickWinner(
    [
    { classification: "growth", score: growth.score, reasons: growth.reasons },
    {
      classification: "quality_compounder",
      score: quality.score,
      reasons: quality.reasons,
    },
    { classification: "value", score: value.score, reasons: value.reasons },
    {
      classification: "financial",
      score: financial.score,
      reasons: financial.reasons,
    },
    {
      classification: "cyclical",
      score: cyclical.score,
      reasons: cyclical.reasons,
    },
  ],
    data
  );

  return {
    classification: winner.classification,
    scores,
    reasons: winner.reasons.length > 0 ? winner.reasons : ["綜合財務特徵"],
  };
}

export function classifyCompany(
  data: NormalizedFinancialData
): CompanyClassification {
  return classifyCompanyWithScores(data).classification;
}

export function evaluatePeReliability(
  classification: CompanyClassification,
  pe: number | null
): PeReliabilityResult {
  if (pe == null || pe <= 0) {
    return { unreliable: true, highRisk: false };
  }

  switch (classification) {
    case "growth":
      if (pe > 120) return { unreliable: true, highRisk: false };
      if (pe > 60) return { unreliable: false, highRisk: true };
      break;
    case "quality_compounder":
      if (pe > 60) return { unreliable: true, highRisk: false };
      if (pe > 40) return { unreliable: false, highRisk: true };
      break;
    case "value":
      if (pe > 40) return { unreliable: true, highRisk: false };
      if (pe > 25) return { unreliable: false, highRisk: true };
      break;
    case "financial":
      if (pe > 30) return { unreliable: true, highRisk: false };
      break;
    case "cyclical":
      if (pe > 50) return { unreliable: true, highRisk: false };
      if (pe > 30) return { unreliable: false, highRisk: true };
      break;
    default:
      if (pe > 150) return { unreliable: true, highRisk: false };
      break;
  }

  return { unreliable: false, highRisk: false };
}

export function applyCompanyClassification(
  data: NormalizedFinancialData
): NormalizedFinancialData {
  const result = classifyCompanyWithScores(data);
  const peReliability = evaluatePeReliability(
    result.classification,
    data.pe.value
  );

  const pe = {
    ...data.pe,
    unreliable: data.pe.unreliable || peReliability.unreliable,
    highRisk: peReliability.highRisk,
  };

  return {
    ...data,
    companyClassification: result.classification,
    classificationScores: result.scores,
    classificationReasons: result.reasons,
    pe,
  };
}

export function isLightAssetModel(classification: CompanyClassification): boolean {
  return classification === "growth" || classification === "quality_compounder";
}

export function isFinancialModel(classification: CompanyClassification): boolean {
  return classification === "financial";
}
