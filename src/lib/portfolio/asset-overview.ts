import type { ComputedPortfolio, CurrencyTotals } from "@/types/stock";

export function getPrimaryPortfolioTotals(
  portfolio: ComputedPortfolio
): (CurrencyTotals & { currency: "TWD" | "USD" }) | null {
  const twd = portfolio.totalsByCurrency.TWD;
  const usd = portfolio.totalsByCurrency.USD;

  if (portfolio.displayCurrency === "TWD" && twd) {
    return { ...twd, currency: "TWD" };
  }
  if (usd) {
    return { ...usd, currency: "USD" };
  }
  if (twd) {
    return { ...twd, currency: "TWD" };
  }
  return null;
}

export function buildFlatAssetHistory(
  totalAssets: number,
  days: number
): { date: string; value: number }[] {
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - index));
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return {
      date: `${month}/${day}`,
      value: totalAssets,
    };
  });
}
