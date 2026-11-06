"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { labelField, numberField } from "@/shared/charts/fields";
import { heatmapColor } from "@/shared/charts/palette";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

type HeatCell = { x: string; y: string; value: number };

function readHeat(
  rows: readonly Datum[] | null | undefined,
  xField: string,
  yField: string,
  colorField: string,
): HeatCell[] {
  const cells: HeatCell[] = [];
  for (const row of rows ?? []) {
    const x = labelField(row, xField);
    const y = labelField(row, yField);
    const value = numberField(row, colorField);
    if (x == null || y == null || value == null) {
      continue;
    }
    cells.push({ x, y, value });
  }
  return cells;
}

export type HeatmapChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
  colorField: string;
};

export function HeatmapChart({
  data,
  xField,
  yField,
  colorField,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: HeatmapChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const cells = readHeat(data, xField, yField, colorField);
  const columns = [...new Set(cells.map((cell) => cell.x))];
  const rows = [...new Set(cells.map((cell) => cell.y))];
  const min = Math.min(...cells.map((cell) => cell.value));
  const max = Math.max(...cells.map((cell) => cell.value));
  const span = max - min || 1;

  return (
    <ChartFrame
      className={className}
      empty={cells.length === 0}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const left = 72;
        const top = 8;
        const width = Math.max(0, plot.width - left - 8);
        const heightPx = Math.max(0, plot.height - top - 28);
        const cellWidth = columns.length > 0 ? width / columns.length : 0;
        const cellHeight = rows.length > 0 ? heightPx / rows.length : 0;
        return (
          <>
            <svg
              aria-label={title ?? "Heatmap"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {columns.map((column, index) => (
                <text
                  key={column}
                  fill={token.colorTextTertiary}
                  fontFamily={token.fontFamily}
                  fontSize={token.fontSizeSM}
                  textAnchor="middle"
                  x={left + (index + 0.5) * cellWidth}
                  y={top + heightPx + 16}
                >
                  {column}
                </text>
              ))}
              {rows.map((row, index) => (
                <text
                  key={row}
                  fill={token.colorTextTertiary}
                  fontFamily={token.fontFamily}
                  fontSize={token.fontSizeSM}
                  textAnchor="end"
                  x={left - 8}
                  y={top + (index + 0.5) * cellHeight}
                >
                  {row}
                </text>
              ))}
              {cells.map((cell) => {
                const column = columns.indexOf(cell.x);
                const row = rows.indexOf(cell.y);
                const unit = (cell.value - min) / span;
                return (
                  <rect
                    key={`${cell.x}-${cell.y}`}
                    fill={heatmapColor(token, unit)}
                    height={Math.max(0, cellHeight - 2)}
                    width={Math.max(0, cellWidth - 2)}
                    x={left + column * cellWidth}
                    y={top + row * cellHeight}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [`${cell.x} · ${cell.y}`, formatMeasure(cell.value)],
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
