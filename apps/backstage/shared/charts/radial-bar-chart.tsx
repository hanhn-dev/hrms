"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { readLabeledValues } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { openArc } from "@/shared/charts/path";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type RadialBarChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
};

export function RadialBarChart({
  data,
  xField,
  yField,
  title,
  height,
  loading = false,
  legend,
  tooltip = true,
  className,
  style,
}: RadialBarChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const all = readLabeledValues(data, xField, yField);
  const items = all.filter((item) => !interaction.hidden.has(item.label));
  const max = Math.max(...items.map((item) => item.value), 0);

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
        const outer = Math.max(16, Math.min(plot.width, plot.height) * 0.4);
        const inner = outer * 0.28;
        const thickness = items.length > 0 ? (outer - inner) / items.length : 0;
        return (
          <>
            <svg
              aria-label={title ?? "Radial bar chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {items.map((item, index) => {
                const radius = outer - index * thickness - thickness / 2;
                const sweep = max > 0 ? (Math.max(item.value, 0) / max) * Math.PI * 1.75 : 0;
                const colorIndex = all.findIndex((entry) => entry.label === item.label);
                return (
                  <path
                    key={item.label}
                    d={openArc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + sweep)}
                    fill="none"
                    stroke={seriesColor(token, colorIndex, all.length)}
                    strokeLinecap="round"
                    strokeWidth={Math.max(4, thickness * 0.62)}
                    style={{ cursor: "pointer" }}
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
