/** Generate deterministic mock price series for charts */
export function generateSparkline(
  seed: number,
  points = 24,
  trend: "up" | "down" | "flat" = "up"
): number[] {
  const data: number[] = [];
  let value = 100 + (seed % 50);
  for (let i = 0; i < points; i++) {
    const noise = Math.sin(i * 0.7 + seed) * 2 + (Math.cos(i * 1.3 + seed * 0.5) * 1.5);
    const drift = trend === "up" ? 0.3 : trend === "down" ? -0.3 : 0;
    value = Math.max(80, value + noise * 0.4 + drift);
    data.push(Math.round(value * 100) / 100);
  }
  return data;
}

export type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y" | "ALL";

const RANGE_POINTS: Record<ChartRange, number> = {
  "1D": 78,
  "1W": 42,
  "1M": 30,
  "3M": 60,
  "1Y": 52,
  "5Y": 60,
  ALL: 80,
};

export function generatePriceHistory(
  basePrice: number,
  seed: number,
  range: ChartRange,
  changePercent: number
): { date: string; price: number }[] {
  const points = RANGE_POINTS[range];
  const trend = changePercent >= 0 ? 1 : -1;
  const data: { date: string; price: number }[] = [];
  let price = basePrice * (1 - (changePercent / 100) * 0.8);

  for (let i = 0; i < points; i++) {
    const noise =
      Math.sin(i * 0.5 + seed) * basePrice * 0.008 +
      Math.cos(i * 0.9 + seed * 0.3) * basePrice * 0.005;
    const drift = (trend * basePrice * 0.002 * i) / points;
    price = Math.max(basePrice * 0.6, price + noise + drift);
    data.push({
      date: `${i}`,
      price: Math.round(price * 100) / 100,
    });
  }
  data[data.length - 1].price = basePrice;
  return data;
}

export function generateAssetHistory(
  total: number,
  days: number,
  seed: number
): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  let value = total * 0.94;
  for (let i = 0; i < days; i++) {
    const noise = Math.sin(i * 0.4 + seed) * total * 0.003;
    value += noise + total * 0.0008;
    data.push({ date: `D${i}`, value: Math.round(value) });
  }
  data[data.length - 1].value = total;
  return data;
}

export function calcUndervaluedPercent(
  currentPrice: number,
  fairPrice: number
): number {
  if (fairPrice <= 0) return 0;
  return Math.round(((fairPrice - currentPrice) / fairPrice) * 100);
}
