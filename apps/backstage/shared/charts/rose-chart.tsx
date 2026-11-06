"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { readSeries } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { sectorPath } from "@/shared/charts/path";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type RoseChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
  seriesField?: string;
};

export function RoseChart({
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
}: RoseChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const model = readSeries(data, xField, yField, seriesField);
  const series = model.series.filter((item) => !interaction.hidden.has(item.name));
  const max = Math.max(
    0,
    ...series.flatMap((item) => item.values.filter((value): value is number => value != null && value > 0)),
  );

  return (
    <ChartFrame
      className={className}
      empty={model.categories.length === 0}
      height={height}
      hidden={interaction.hidden}
      legend={legend ?? (Boolean(seriesField) || model.series.length > 1)}
      legendItems={model.series.map((item, index) => ({
        id: item.name,
        label: item.name,
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
        const radius = Math.max(12, Math.min(plot.width, plot.height) * 0.38);
        const count = model.categories.length;
        const sweep = count > 0 ? (Math.PI * 2) / count : 0;
        return (
          <>
            <svg
              aria-label={title ?? "Rose chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {series.flatMap((item) =>
                item.values.map((value, index) => {
                  if (value == null || value <= 0 || max <= 0) {
                    return null;
                  }
                  const start = -Math.PI / 2 + index * sweep;
                  const colorIndex = model.series.findIndex((entry) => entry.name === item.name);
                  const color = seriesColor(token, colorIndex, Math.max(model.series.length, count));
                  const sliceColor =
                    model.series.length > 1
                      ? color
                      : seriesColor(token, index, count);
                  return (
                    <path
                      key={`${item.name}-${model.categories[index] ?? index}`}
                      d={sectorPath(cx, cy, radius * (value / max), start, start + sweep * 0.92)}
                      fill={sliceColor}
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
                            model.categories[index] ?? "",
                            `${item.name}: ${formatMeasure(value)}`,
                          ],
                        });
                      }}
                    />
                  );
                }),
              )}
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
