"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { treeValue } from "@/shared/charts/fields";
import { packCircles } from "@/shared/charts/layout";
import { seriesColor } from "@/shared/charts/palette";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, ChartTreeNode } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type CirclePackingChartProps = ChartChromeProps & {
  data?: ChartTreeNode | null;
};

export function CirclePackingChart({
  data,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: CirclePackingChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();

  return (
    <ChartFrame
      className={className}
      empty={!data || treeValue(data) <= 0}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const radius = Math.max(16, Math.min(plot.width, plot.height) * 0.46);
        const circles = data ? packCircles(data, radius) : [];
        const drawn = circles.filter((circle) => circle.depth > 0);
        return (
          <>
            <svg
              aria-label={title ?? "Circle packing chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {drawn.map((circle, index) => (
                <g key={`${circle.name}-${circle.depth}-${index}`}>
                  <circle
                    cx={plot.width / 2 + circle.cx}
                    cy={plot.height / 2 + circle.cy}
                    fill={seriesColor(token, index, drawn.length)}
                    fillOpacity={circle.depth === 1 ? 0.85 : 0.55}
                    r={circle.r}
                    stroke={token.colorBgContainer}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [circle.name, formatMeasure(circle.r)],
                      });
                    }}
                  />
                  {circle.r > 18 ? (
                    <text
                      fill={token.colorTextLightSolid}
                      fontFamily={token.fontFamily}
                      fontSize={token.fontSizeSM}
                      textAnchor="middle"
                      x={plot.width / 2 + circle.cx}
                      y={plot.height / 2 + circle.cy}
                    >
                      {circle.name}
                    </text>
                  ) : null}
                </g>
              ))}
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
