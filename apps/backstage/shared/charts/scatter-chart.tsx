"use client";

import { theme } from "antd";
import { PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { ChartFrame } from "@/shared/charts/frame";
import { labelField, numberField } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import { plotBox, type ChartChromeProps, type Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

type ScatterPoint = {
  x: number;
  y: number;
  size: number;
  series: string;
  label: string;
};

function readScatter(
  rows: readonly Datum[] | null | undefined,
  xField: string,
  yField: string,
  seriesField?: string,
  sizeField?: string,
): { points: ScatterPoint[]; series: string[] } {
  const points: ScatterPoint[] = [];
  const series: string[] = [];
  for (const row of rows ?? []) {
    const x = numberField(row, xField);
    const y = numberField(row, yField);
    if (x == null || y == null) {
      continue;
    }
    const name = seriesField ? (labelField(row, seriesField) ?? "Value") : "Value";
    if (!series.includes(name)) {
      series.push(name);
    }
    const size = sizeField ? numberField(row, sizeField) : null;
    points.push({
      x,
      y,
      size: size ?? 1,
      series: name,
      label: labelField(row, xField) ?? formatMeasure(x),
    });
  }
  return { points, series };
}

export type ScatterChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
  seriesField?: string;
  sizeField?: string;
};

export function ScatterChart({
  data,
  xField,
  yField,
  seriesField,
  sizeField,
  title,
  height,
  loading = false,
  legend,
  tooltip = true,
  className,
  style,
}: ScatterChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const model = readScatter(data, xField, yField, seriesField, sizeField);
  const visible = model.points.filter((point) => !interaction.hidden.has(point.series));
  const xScale = linearScale(visible.map((point) => point.x));
  const yScale = linearScale(visible.map((point) => point.y));
  const maxSize = Math.max(...model.points.map((point) => point.size), 1);

  return (
    <ChartFrame
      className={className}
      empty={model.points.length === 0}
      height={height}
      hidden={interaction.hidden}
      legend={legend ?? (Boolean(seriesField) || model.series.length > 1)}
      legendItems={model.series.map((name, index) => ({
        id: name,
        label: name,
        color: seriesColor(token, index, model.series.length),
      }))}
      loading={loading}
      style={style}
      title={title}
      onToggleLegend={interaction.toggle}
    >
      {(plot) => {
        const box = plotBox(plot.width, plot.height);
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? "Scatter chart"}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              <ValueGrid axis="y" box={box} scale={yScale} token={token} />
              <ValueGrid axis="x" box={box} scale={xScale} token={token} />
              {visible.map((point, index) => {
                const colorIndex = model.series.indexOf(point.series);
                const radius = 4 + (point.size / maxSize) * 12;
                return (
                  <circle
                    key={`${point.series}-${point.x}-${point.y}-${index}`}
                    cx={box.x + xScale.unit(point.x) * box.width}
                    cy={box.y + (1 - yScale.unit(point.y)) * box.height}
                    fill={seriesColor(token, colorIndex, model.series.length)}
                    fillOpacity={0.85}
                    r={radius}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [
                          point.series,
                          `${xField}: ${formatMeasure(point.x)}`,
                          `${yField}: ${formatMeasure(point.y)}`,
                        ],
                      });
                    }}
                  />
                );
              })}
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
