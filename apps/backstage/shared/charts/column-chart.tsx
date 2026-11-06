"use client";

import { theme } from "antd";
import { CategoryLabels, PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { columnMarks, columnRect } from "@/shared/charts/bar-geometry";
import { ChartFrame } from "@/shared/charts/frame";
import { readSeries } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import {
  PLOT_MARGIN,
  plotBox,
  type ChartChromeProps,
  type ChartMargin,
  type Datum,
} from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

const TINY_MARGIN: ChartMargin = { top: 4, right: 2, bottom: 4, left: 2 };

export type BarPlotProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
  seriesField?: string;
  stacked?: boolean;
  horizontal?: boolean;
  axes?: boolean;
};

export function BarPlot({
  data,
  xField,
  yField,
  seriesField,
  stacked = false,
  horizontal = false,
  axes = true,
  title,
  height,
  loading = false,
  legend,
  tooltip = true,
  className,
  style,
}: BarPlotProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const model = readSeries(data, xField, yField, seriesField);
  const visible = model.series.filter((series) => !interaction.hidden.has(series.name));
  const marks = columnMarks({
    categories: model.categories,
    series: visible,
    stacked,
  });
  const scale = linearScale(marks.flatMap((mark) => [mark.y0, mark.y1]));
  const showLegend = legend ?? (Boolean(seriesField) || model.series.length > 1);
  const margin: ChartMargin = axes
    ? horizontal
      ? { ...PLOT_MARGIN, left: 88 }
      : PLOT_MARGIN
    : TINY_MARGIN;

  return (
    <ChartFrame
      className={className}
      empty={model.categories.length === 0}
      height={height}
      hidden={interaction.hidden}
      legend={showLegend}
      legendItems={model.series.map((series, index) => ({
        id: series.name,
        label: series.name,
        color: seriesColor(token, index, model.series.length),
      }))}
      loading={loading}
      style={style}
      title={title}
      onToggleLegend={interaction.toggle}
    >
      {(plot) => {
        const box = plotBox(plot.width, plot.height, margin);
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? (horizontal ? "Bar chart" : "Column chart")}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              {axes ? (
                <ValueGrid
                  axis={horizontal ? "x" : "y"}
                  box={box}
                  scale={scale}
                  token={token}
                />
              ) : null}
              {marks.map((mark) => {
                const colorIndex = model.series.findIndex((item) => item.name === mark.series);
                const color = seriesColor(token, colorIndex, model.series.length);
                const rect = columnRect(mark, box, scale, horizontal);
                return (
                  <rect
                    key={`${mark.series}-${mark.category}`}
                    fill={color}
                    height={rect.height}
                    rx={2}
                    width={rect.width}
                    x={rect.x}
                    y={rect.y}
                    style={{
                      cursor: "pointer",
                      transition: `fill-opacity ${token.motionDurationFast}`,
                    }}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [
                          mark.category,
                          `${mark.series}: ${formatMeasure(mark.value)}`,
                        ],
                      });
                    }}
                  />
                );
              })}
              {axes ? (
                <CategoryLabels
                  axis={horizontal ? "y" : "x"}
                  box={box}
                  labels={model.categories}
                  token={token}
                />
              ) : null}
            </PlotSvg>
            {tooltip && interaction.tip ? (
              <ChartTooltip
                bounds={plot}
                lines={interaction.tip.lines}
                x={interaction.tip.x}
                y={interaction.tip.y}
              />
            ) : null}
          </>
        );
      }}
    </ChartFrame>
  );
}

export function ColumnChart(props: Omit<BarPlotProps, "horizontal">): React.JSX.Element {
  return <BarPlot {...props} horizontal={false} />;
}
