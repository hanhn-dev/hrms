"use client";

import { ColumnChart } from "@/shared/charts/column-chart";
import { histogramBins } from "@/shared/charts/layout";
import { formatMeasure } from "@/shared/charts/scale";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { numericValues } from "@/shared/charts/fields";

export type HistogramChartProps = ChartChromeProps & {
  data?: readonly number[] | readonly Datum[] | null;
  binField?: string;
  binCount?: number;
};

export function HistogramChart({
  data,
  binField,
  binCount = 8,
  ...chrome
}: HistogramChartProps): React.JSX.Element {
  const bins = histogramBins(numericValues(data, binField), binCount);
  const rows: Datum[] = bins.map((bin) => ({
    bin: `${formatMeasure(bin.start)}–${formatMeasure(bin.end)}`,
    count: bin.count,
  }));
  return (
    <ColumnChart
      {...chrome}
      data={rows}
      title={chrome.title}
      xField="bin"
      yField="count"
    />
  );
}
