"use client";

import { theme } from "antd";
import { CategoryLabels, PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { ChartFrame } from "@/shared/charts/frame";
import { groupNumbers } from "@/shared/charts/fields";
import { kernelDensity } from "@/shared/charts/layout";
import { px } from "@/shared/charts/path";
import { bandScale, formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import { plotBox, type ChartChromeProps, type Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type ViolinChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
};

export function ViolinChart({
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
}: ViolinChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const groups = groupNumbers(data, xField, yField);
  const scale = linearScale(groups.flatMap((group) => group.values));
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
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? "Violin chart"}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              <ValueGrid axis="y" box={box} scale={scale} token={token} />
              {groups.map((group, index) => {
                const band = bands[index];
                const density = kernelDensity(group.values, 24);
                const peak = Math.max(...density.map((point) => point.y), 0);
                if (!band || peak <= 0) {
                  return null;
                }
                const center = box.x + ((band.start + band.end) / 2) * box.width;
                const half = (band.size * box.width) / 2;
                const right = density.map((point) => {
                  const y = px(box.y + (1 - scale.unit(point.x)) * box.height);
                  const x = px(center + (point.y / peak) * half);
                  return `${x},${y}`;
                });
                const left = [...density].reverse().map((point) => {
                  const y = px(box.y + (1 - scale.unit(point.x)) * box.height);
                  const x = px(center - (point.y / peak) * half);
                  return `${x},${y}`;
                });
                return (
                  <polygon
                    key={group.category}
                    fill={token.colorPrimary}
                    fillOpacity={0.28}
                    points={[...right, ...left].join(" ")}
                    stroke={token.colorPrimary}
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
                          `${group.values.length} values`,
                          `median ${formatMeasure(group.values.slice().sort((a, b) => a - b)[Math.floor(group.values.length / 2)] ?? 0)}`,
                        ],
                      });
                    }}
                  />
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
