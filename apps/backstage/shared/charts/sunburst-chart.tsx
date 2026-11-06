"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { treeValue } from "@/shared/charts/fields";
import { sunburstArcs } from "@/shared/charts/layout";
import { seriesColor } from "@/shared/charts/palette";
import { sectorPath } from "@/shared/charts/path";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, ChartTreeNode } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type SunburstChartProps = ChartChromeProps & {
  data?: ChartTreeNode | null;
};

export function SunburstChart({
  data,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: SunburstChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const arcs = data ? sunburstArcs(data) : [];
  const maxDepth = Math.max(1, ...arcs.map((arc) => arc.depth));

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
        const cx = plot.width / 2;
        const cy = plot.height / 2;
        const radius = Math.max(16, Math.min(plot.width, plot.height) * 0.42);
        const ring = radius / maxDepth;
        return (
          <>
            <svg
              aria-label={title ?? "Sunburst chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {arcs.map((arc, index) => (
                <path
                  key={`${arc.name}-${arc.depth}-${index}`}
                  d={sectorPath(
                    cx,
                    cy,
                    arc.depth * ring,
                    arc.start - Math.PI / 2,
                    arc.end - Math.PI / 2,
                    (arc.depth - 1) * ring,
                  )}
                  fill={seriesColor(token, index, arcs.length)}
                  stroke={token.colorBgContainer}
                  strokeWidth={1}
                  style={{ cursor: "pointer" }}
                  onMouseMove={(event) => {
                    if (!tooltip) {
                      return;
                    }
                    const at = pointerIn(event);
                    interaction.showTip({
                      x: at.x,
                      y: at.y,
                      lines: [arc.name, formatMeasure(arc.value)],
                    });
                  }}
                />
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
