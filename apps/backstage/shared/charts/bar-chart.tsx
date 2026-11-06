"use client";

import { BarPlot, type BarPlotProps } from "@/shared/charts/column-chart";

export function BarChart(props: Omit<BarPlotProps, "horizontal">): React.JSX.Element {
  return <BarPlot {...props} horizontal />;
}
