interface StockChartProps {
  basePrice: number;
  changePercent: number;
  seed: number;
  positive?: boolean;
}

export function StockChart(props: StockChartProps) {
  void props;
  return <div className="rounded-2xl p-6 text-center text-sm text-text-secondary">尚未取得歷史行情，暫不顯示走勢圖。</div>;
}
