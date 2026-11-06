"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { readSeries } from "@/shared/charts/fields";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type BidirectionalBarChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
  seriesField: string;
};

export function BidirectionalBarChart({
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
}: BidirectionalBarChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const model = readSeries(data, xField, yField, seriesField);
  const left = model.series[0];
  const right = model.series[1];
  const max = Math.max(
    0,
    ...[left, right].flatMap((series) =>
      series && !interaction.hidden.has(series.name)
        ? series.values.filter((value): value is number => value != null).map((value) => Math.abs(value))
        : [],
    ),
  );

  return (
    <ChartFrame
      className={className}
      empty={!left || !right || model.categories.length === 0}
      height={height}
      hidden={interaction.hidden}
      legend={legend ?? true}
      legendItems={[left, right].flatMap((series, index) =>
        series
          ? [
              {
                id: series.name,
                label: series.name,
                color: index === 0 ? token.colorPrimary : token.cyan,
              },
            ]
          : [],
      )}
      loading={loading}
      style={style}
      title={title}
      onToggleLegend={interaction.toggle}
    >
      {(plot) => {
        const leftPad = 88;
        const rightPad = 12;
        const top = 8;
        const rowHeight =
          model.categories.length > 0
            ? (plot.height - top - 8) / model.categories.length
            : 0;
        const center = leftPad + (plot.width - leftPad - rightPad) / 2;
        const half = (plot.width - leftPad - rightPad) / 2;
        return (
          <>
            <svg
              aria-label={title ?? "Bidirectional bar chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              <line
                stroke={token.colorSplit}
                x1={center}
                x2={center}
                y1={top}
                y2={plot.height - 8}
              />
              {model.categories.map((category, index) => {
                const leftValue = left?.values[index] ?? null;
                const rightValue = right?.values[index] ?? null;
                const y = top + index * rowHeight + rowHeight * 0.2;
                const bar = rowHeight * 0.6;
                const leftWidth =
                  left && !interaction.hidden.has(left.name) && leftValue != null && max > 0
                    ? (Math.abs(leftValue) / max) * half
                    : 0;
                const rightWidth =
                  right && !interaction.hidden.has(right.name) && rightValue != null && max > 0
                    ? (Math.abs(rightValue) / max) * half
                    : 0;
                return (
                  <g key={category}>
                    <text
                      dominantBaseline="middle"
                      fill={token.colorTextTertiary}
                      fontFamily={token.fontFamily}
                      fontSize={token.fontSizeSM}
                      textAnchor="end"
                      x={leftPad - 8}
                      y={y + bar / 2}
                    >
                      {category}
                    </text>
                    <rect
                      fill={token.colorPrimary}
                      height={bar}
                      rx={2}
                      width={leftWidth}
                      x={center - leftWidth}
                      y={y}
                      style={{ cursor: "pointer" }}
                      onMouseMove={(event) => {
                        if (!tooltip || !left) {
                          return;
                        }
                        const at = pointerIn(event);
                        interaction.showTip({
                          x: at.x,
                          y: at.y,
                          lines: [category, `${left.name}: ${formatMeasure(leftValue ?? 0)}`],
                        });
                      }}
                    />
                    <rect
                      fill={token.cyan}
                      height={bar}
                      rx={2}
                      width={rightWidth}
                      x={center}
                      y={y}
                      style={{ cursor: "pointer" }}
                      onMouseMove={(event) => {
                        if (!tooltip || !right) {
                          return;
                        }
                        const at = pointerIn(event);
                        interaction.showTip({
                          x: at.x,
                          y: at.y,
                          lines: [category, `${right.name}: ${formatMeasure(rightValue ?? 0)}`],
                        });
                      }}
                    />
                  </g>
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
