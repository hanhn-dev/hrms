"use client";

import { theme } from "antd";
import { CategoryLabels, PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { ChartFrame } from "@/shared/charts/frame";
import { readSeries } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { areaPath, linePath, type Point } from "@/shared/charts/path";
import { bandScale, formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import {
  PLOT_MARGIN,
  plotBox,
  type ChartChromeProps,
  type ChartMargin,
  type Datum,
} from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

const TINY_MARGIN: ChartMargin = { top: 4, right: 4, bottom: 4, left: 4 };

export type TrendChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
  seriesField?: string;
  smooth?: boolean;
  axes?: boolean;
  filled?: boolean;
};

export function TrendChart({
  data,
  xField,
  yField,
  seriesField,
  smooth = false,
  axes = true,
  filled = false,
  title,
  height,
  loading = false,
  legend,
  tooltip = true,
  className,
  style,
}: TrendChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const model = readSeries(data, xField, yField, seriesField);
  const visible = model.series.filter((series) => !interaction.hidden.has(series.name));
  const domain = visible.flatMap((series) =>
    series.values.filter((value): value is number => value != null),
  );
  const scale = linearScale(domain);
  const showLegend = legend ?? (Boolean(seriesField) || model.series.length > 1);

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
        const box = plotBox(plot.width, plot.height, axes ? PLOT_MARGIN : TINY_MARGIN);
        const bands = bandScale(model.categories);
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? (filled ? "Area chart" : "Line chart")}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              {axes ? <ValueGrid axis="y" box={box} scale={scale} token={token} /> : null}
              {visible.map((series) => {
                const colorIndex = model.series.findIndex((item) => item.name === series.name);
                const color = seriesColor(token, colorIndex, model.series.length);
                const runs: { point: Point; label: string; value: number }[][] = [];
                let run: { point: Point; label: string; value: number }[] = [];
                series.values.forEach((value, index) => {
                  const band = bands[index];
                  const label = model.categories[index];
                  if (value == null || !band || label == null) {
                    if (run.length > 0) {
                      runs.push(run);
                    }
                    run = [];
                    return;
                  }
                  run.push({
                    label,
                    value,
                    point: {
                      x: box.x + ((band.start + band.end) / 2) * box.width,
                      y: box.y + (1 - scale.unit(value)) * box.height,
                    },
                  });
                });
                if (run.length > 0) {
                  runs.push(run);
                }
                const baseline = box.y + (1 - scale.unit(0)) * box.height;
                return runs.map((points, runIndex) => (
                  <g key={`${series.name}-${runIndex}`}>
                    {filled ? (
                      <path
                        d={areaPath(
                          points.map((item) => item.point),
                          baseline,
                          smooth,
                        )}
                        fill={color}
                        fillOpacity={0.28}
                      />
                    ) : null}
                    <path
                      d={linePath(
                        points.map((item) => item.point),
                        smooth,
                      )}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      style={{ transition: `stroke-opacity ${token.motionDurationFast}` }}
                    />
                    {points.map((item) => (
                      <circle
                        key={`${series.name}-${item.label}`}
                        cx={item.point.x}
                        cy={item.point.y}
                        fill={color}
                        r={3}
                        style={{ cursor: "pointer" }}
                        onMouseMove={(event) => {
                          if (!tooltip) {
                            return;
                          }
                          const at = pointerIn(event);
                          interaction.showTip({
                            x: at.x,
                            y: at.y,
                            lines: [item.label, `${series.name}: ${formatMeasure(item.value)}`],
                          });
                        }}
                      />
                    ))}
                  </g>
                ));
              })}
              {axes ? (
                <CategoryLabels
                  axis="x"
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

export function LineChart(props: Omit<TrendChartProps, "filled">): React.JSX.Element {
  return <TrendChart {...props} filled={false} />;
}
