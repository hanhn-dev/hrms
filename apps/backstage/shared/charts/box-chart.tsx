"use client";

import { theme } from "antd";
import { CategoryLabels, PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { ChartFrame } from "@/shared/charts/frame";
import { groupNumbers } from "@/shared/charts/fields";
import { quartiles } from "@/shared/charts/layout";
import { bandScale, formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import { plotBox, type ChartChromeProps, type Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type BoxChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
};

export function BoxChart({
  data,
  xField,
  yField,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: BoxChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const groups = groupNumbers(data, xField, yField)
    .map((group) => ({ category: group.category, summary: quartiles(group.values) }))
    .filter((group): group is { category: string; summary: NonNullable<ReturnType<typeof quartiles>> } => group.summary != null);
  const scale = linearScale(groups.flatMap((group) => [group.summary.min, group.summary.max]));
  const bands = bandScale(groups.map((group) => group.category));

  return (
    <ChartFrame
      className={className}
      empty={groups.length === 0}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const box = plotBox(plot.width, plot.height);
        const yOf = (value: number): number => box.y + (1 - scale.unit(value)) * box.height;
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? "Box chart"}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              <ValueGrid axis="y" box={box} scale={scale} token={token} />
              {groups.map((group, index) => {
                const band = bands[index];
                if (!band) {
                  return null;
                }
                const center = box.x + ((band.start + band.end) / 2) * box.width;
                const barWidth = band.size * box.width * 0.7;
                const summary = group.summary;
                return (
                  <g
                    key={group.category}
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
                          group.category,
                          `min ${formatMeasure(summary.min)}`,
                          `Q1 ${formatMeasure(summary.q1)}`,
                          `median ${formatMeasure(summary.median)}`,
                          `Q3 ${formatMeasure(summary.q3)}`,
                          `max ${formatMeasure(summary.max)}`,
                        ],
                      });
                    }}
                  >
                    <line
                      stroke={token.colorPrimary}
                      x1={center}
                      x2={center}
                      y1={yOf(summary.min)}
                      y2={yOf(summary.max)}
                    />
                    <line
                      stroke={token.colorPrimary}
                      x1={center - barWidth / 4}
                      x2={center + barWidth / 4}
                      y1={yOf(summary.min)}
                      y2={yOf(summary.min)}
                    />
                    <line
                      stroke={token.colorPrimary}
                      x1={center - barWidth / 4}
                      x2={center + barWidth / 4}
                      y1={yOf(summary.max)}
                      y2={yOf(summary.max)}
                    />
                    <rect
                      fill={token.colorPrimaryBg}
                      height={Math.max(1, yOf(summary.q1) - yOf(summary.q3))}
                      stroke={token.colorPrimary}
                      width={barWidth}
                      x={center - barWidth / 2}
                      y={yOf(summary.q3)}
                    />
                    <line
                      stroke={token.colorPrimary}
                      strokeWidth={2}
                      x1={center - barWidth / 2}
                      x2={center + barWidth / 2}
                      y1={yOf(summary.median)}
                      y2={yOf(summary.median)}
                    />
                  </g>
                );
              })}
              <CategoryLabels
                axis="x"
                box={box}
                labels={groups.map((group) => group.category)}
                token={token}
              />
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
