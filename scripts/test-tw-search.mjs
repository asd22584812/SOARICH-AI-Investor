import fallback from "../src/data/fallbackTaiwanStocks.json" with { type: "json" };

function scoreTaiwanStock(stock, query) {
  const q = query.trim().toLowerCase();
  const symbol = stock.symbol.toLowerCase();
  const name = stock.name.trim().toLowerCase();
  const shortName = stock.shortName.trim().toLowerCase();
  const compactName = name.replace(/股份有限公司|有限公司/g, "");

  if (symbol === q) return 100;
  if (shortName === q) return 98;
  if (name === q || compactName === q) return 96;
  if (symbol.startsWith(q)) return 85;
  if (shortName.startsWith(q)) return 82;
  if (name.startsWith(q) || compactName.startsWith(q)) return 80;
  if (shortName.includes(q)) return 70;
  if (name.includes(q) || compactName.includes(q)) return 65;
  if (symbol.includes(q)) return 60;
  return 0;
}

function search(stocks, query, limit = 5) {
  return stocks
    .map((stock) => ({
      ...stock,
      score: scoreTaiwanStock(stock, query),
      yahooSymbol: `${stock.symbol}${stock.yahooSuffix}`,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
    .slice(0, limit);
}

const queries = ["國巨", "台積電", "聯發科", "欣興", "世芯", "創意", "信驊", "台", "2327"];

console.log("Total stocks:", fallback.length);
for (const q of queries) {
  const matches = search(fallback, q, 5);
  console.log(
    `${q}:`,
    matches.map((x) => `${x.shortName} ${x.symbol} ${x.yahooSymbol}`).join(" | ")
  );
}
