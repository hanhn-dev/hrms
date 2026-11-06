"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { readLabeledValues } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { sectorPath } from "@/shared/charts/path";
import { formatMeasure, pieSlices } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type PieChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  angleField: string;
  colorField: string;
  innerRadius?: number;
};

export function PieChart({
  data,
  angleField,
  colorField,
  innerRadius = 0,
  title,
  height,
  loading = false,
  legend,
  tooltip = true,
  className,
  style,
}: PieChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const items = readLabeledValues(data, colorField, angleField).filter(
    (item) => !interaction.hidden.has(item.label) && item.value > 0,
  );
  const all = readLabeledValues(data, colorField, angleField);
  const slices = pieSlices(items.map((item) => item.value));

  return (
    <ChartFrame
      className={className}
      empty={all.length === 0}
      height={height}
      hidden={interaction.hidden}
      legend={legend ?? all.length > 0}
      legendItems={all.map((item, index) => ({
        id: item.label,
        label: item.label,
        color: seriesColor(token, index, all.length),
      }))}
      loading={loading}
      style={style}
      title={title}
      onToggleLegend={interaction.toggle}
    >
      {(plot) => {
        const cx = plot.width / 2;
        const cy = plot.height / 2;
        const radius = Math.max(8, Math.min(plot.width, plot.height) * 0.36);
        const inner = radius * Math.min(0.9, Math.max(0, innerRadius));
        return (
          <>
            <svg
              aria-label={title ?? "Pie chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {slices.map((slice) => {
                const item = items[slice.index];
                if (!item) {
                  return null;
                }
                const colorIndex = all.findIndex((entry) => entry.label === item.label);
                const color = seriesColor(token, colorIndex, all.length);
                return (
                  <path
                    key={item.label}
                    d={sectorPath(cx, cy, radius, slice.start, slice.end, inner)}
                    fill={color}
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
                        lines: [item.label, formatMeasure(item.value)],
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
