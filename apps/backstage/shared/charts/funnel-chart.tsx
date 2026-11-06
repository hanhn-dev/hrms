"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { readLabeledValues } from "@/shared/charts/fields";
import { seriesColor } from "@/shared/charts/palette";
import { px } from "@/shared/charts/path";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type FunnelChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
};

export function FunnelChart({
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
}: FunnelChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const all = readLabeledValues(data, xField, yField);
  const items = all.filter((item) => !interaction.hidden.has(item.label) && item.value > 0);
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
        const step = items.length > 0 ? plot.height / items.length : 0;
        const pad = 24;
        return (
          <>
            <svg
              aria-label={title ?? "Funnel chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {items.map((item, index) => {
                const next = items[index + 1]?.value ?? item.value;
                const topWidth = max > 0 ? (item.value / max) * (plot.width - pad * 2) : 0;
                const bottomWidth = max > 0 ? (next / max) * (plot.width - pad * 2) : 0;
                const y = index * step;
                const mid = plot.width / 2;
                const path = `M ${px(mid - topWidth / 2)} ${px(y + 2)} L ${px(mid + topWidth / 2)} ${px(y + 2)} L ${px(mid + bottomWidth / 2)} ${px(y + step - 2)} L ${px(mid - bottomWidth / 2)} ${px(y + step - 2)} Z`;
                const colorIndex = all.findIndex((entry) => entry.label === item.label);
                return (
                  <path
                    key={item.label}
                    d={path}
                    fill={seriesColor(token, colorIndex, all.length)}
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
