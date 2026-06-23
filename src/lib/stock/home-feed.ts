import type { HomeMarketFeed, HomeStockCard, StockAnalysis } from "@/types/stock";

const SECTION_LIMIT = 5;
const MAX_SECTION_APPEARANCES = 2;

const TODAY_FOCUS_STRICT = { minRating: 70, minMos: -20 };
const TODAY_FOCUS_RELAXED = { minRating: 65, minMos: -30 };

export function calculateRadarScore(input: {
  soarichRating: number;
  valuationScore: number;
  moatScore: number;
}): number {
  return Math.round(
    input.soarichRating * 0.5 +
      input.valuationScore * 0.3 +
      input.moatScore * 0.2
  );
}

function toHomeStockCard(analysis: StockAnalysis): HomeStockCard {
  return {
    symbol: analysis.symbol,
    name: analysis.name,
    market: analysis.market,
    score: analysis.totalScore,
    entryLabel: analysis.entryLabel,
    entrySignal: analysis.entrySignal,
    price: analysis.price,
    fairPrice: analysis.valuation.fairPrice,
    undervaluedPercent: Math.max(
      0,
      Math.round(analysis.valuation.marginOfSafety)
    ),
    currency: analysis.currency,
  };
}

function eligibleAnalyses(analyses: StockAnalysis[]): StockAnalysis[] {
  return analyses.filter(
    (analysis) =>
      analysis.totalScore > 0 &&
      Number.isFinite(analysis.valuation.marginOfSafety)
  );
}

function canAddSymbol(
  symbol: string,
  appearanceCount: Map<string, number>
): boolean {
  return (appearanceCount.get(symbol) ?? 0) < MAX_SECTION_APPEARANCES;
}

function addToSection(
  card: HomeStockCard,
  appearanceCount: Map<string, number>
): void {
  const count = appearanceCount.get(card.symbol) ?? 0;
  appearanceCount.set(card.symbol, count + 1);
}

function pickFromSorted(
  sorted: StockAnalysis[],
  appearanceCount: Map<string, number>,
  limit = SECTION_LIMIT
): HomeStockCard[] {
  const kept: HomeStockCard[] = [];

  for (const analysis of sorted) {
    if (kept.length >= limit) break;
    if (!canAddSymbol(analysis.symbol, appearanceCount)) continue;
    const card = toHomeStockCard(analysis);
    kept.push(card);
    addToSection(card, appearanceCount);
  }

  return kept;
}

function buildTodayFocusCandidates(
  analyses: StockAnalysis[],
  minRating: number,
  minMos: number
): StockAnalysis[] {
  return eligibleAnalyses(analyses)
    .filter(
      (analysis) =>
        analysis.totalScore >= minRating &&
        analysis.valuation.marginOfSafety >= minMos
    )
    .map((analysis) => ({
      analysis,
      radarScore: calculateRadarScore({
        soarichRating: analysis.totalScore,
        valuationScore: analysis.aiScore.valuation,
        moatScore: analysis.moat.score,
      }),
    }))
    .sort((a, b) => b.radarScore - a.radarScore)
    .map(({ analysis }) => analysis);
}

function pickTodayFocus(
  analyses: StockAnalysis[],
  appearanceCount: Map<string, number>
): HomeStockCard[] {
  let candidates = buildTodayFocusCandidates(
    analyses,
    TODAY_FOCUS_STRICT.minRating,
    TODAY_FOCUS_STRICT.minMos
  );

  if (candidates.length < SECTION_LIMIT) {
    candidates = buildTodayFocusCandidates(
      analyses,
      TODAY_FOCUS_RELAXED.minRating,
      TODAY_FOCUS_RELAXED.minMos
    );
  }

  return pickFromSorted(candidates, appearanceCount);
}

export function buildHomeMarketFeed(analyses: StockAnalysis[]): HomeMarketFeed {
  const pool = eligibleAnalyses(analyses);
  const appearanceCount = new Map<string, number>();

  const feed: HomeMarketFeed = {
    todayFocus: pickTodayFocus(analyses, appearanceCount),
    undervalued: pickFromSorted(
      [...pool].sort(
        (a, b) => b.valuation.marginOfSafety - a.valuation.marginOfSafety
      ),
      appearanceCount
    ),
    highQuality: pickFromSorted(
      [...pool].sort((a, b) => b.totalScore - a.totalScore),
      appearanceCount
    ),
    moat: pickFromSorted(
      [...pool].sort((a, b) => b.moat.score - a.moat.score),
      appearanceCount
    ),
  };

  return feed;
}
