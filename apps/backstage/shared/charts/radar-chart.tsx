"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { readSeries } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { px } from "@/shared/charts/path";
import { formatMeasure, radarPoint } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type RadarChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
  seriesField?: string;
};

export function RadarChart({
  data,
  xField,
  yField,
  seriesField,
  title,
  height,
  loading = false,
  legend,
  tooltip = true,
  className,
  style,
}: RadarChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const model = readSeries(data, xField, yField, seriesField);
  const visible = model.series.filter((series) => !interaction.hidden.has(series.name));
  const max = Math.max(
    0,
    ...visible.flatMap((series) =>
      series.values.filter((value): value is number => value != null),
    ),
  );

  return (
    <ChartFrame
      className={className}
      empty={model.categories.length < 3}
      height={height}
      hidden={interaction.hidden}
      legend={legend ?? (Boolean(seriesField) || model.series.length > 1)}
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
        const cx = plot.width / 2;
        const cy = plot.height / 2;
        const radius = Math.max(16, Math.min(plot.width, plot.height) * 0.36);
        const count = model.categories.length;
        const rings = [0.25, 0.5, 0.75, 1];
        return (
          <>
            <svg
              aria-label={title ?? "Radar chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {rings.map((ring) => {
                const points = model.categories.map((_, index) => {
                  const point = radarPoint(index, count, radius * ring);
                  return `${px(cx + point.x)},${px(cy + point.y)}`;
                });
                return (
                  <polygon
                    key={ring}
                    fill="none"
                    points={points.join(" ")}
                    stroke={token.colorSplit}
                  />
                );
              })}
              {model.categories.map((category, index) => {
                const point = radarPoint(index, count, radius);
                return (
                  <g key={category}>
                    <line
                      stroke={token.colorSplit}
                      x1={cx}
                      x2={px(cx + point.x)}
                      y1={cy}
                      y2={px(cy + point.y)}
                    />
                    <text
                      fill={token.colorTextTertiary}
                      fontFamily={token.fontFamily}
                      fontSize={token.fontSizeSM}
                      textAnchor="middle"
                      x={px(cx + point.x * 1.12)}
                      y={px(cy + point.y * 1.12)}
                    >
                      {category}
                    </text>
                  </g>
                );
              })}
              {visible.map((series) => {
                const colorIndex = model.series.findIndex((item) => item.name === series.name);
                const color = seriesColor(token, colorIndex, model.series.length);
                const points = series.values.map((value, index) => {
                  const point = radarPoint(index, count, radius * ((value ?? 0) / (max || 1)));
                  return `${px(cx + point.x)},${px(cy + point.y)}`;
                });
                return (
                  <polygon
                    key={series.name}
                    fill={color}
                    fillOpacity={0.2}
                    points={points.join(" ")}
                    stroke={color}
                    strokeWidth={2}
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
                          series.name,
                          ...model.categories.map(
                            (category, index) =>
                              `${category}: ${formatMeasure(series.values[index] ?? 0)}`,
                          ),
                        ],
                      });
                    }}
                  />
                );
              })}
            </svg>
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
