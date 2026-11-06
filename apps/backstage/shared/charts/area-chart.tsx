"use client";

import { TrendChart, type TrendChartProps } from "@/shared/charts/line-chart";

export function AreaChart(
  props: Omit<TrendChartProps, "filled">,
): React.JSX.Element {
  return <TrendChart {...props} filled />;
}
