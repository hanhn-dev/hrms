"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { vennLayout } from "@/shared/charts/layout";
import { seriesColor } from "@/shared/charts/palette";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, VennDatum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type VennChartProps = ChartChromeProps & {
  data?: readonly VennDatum[] | null;
};

export function VennChart({
  data,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: VennChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const layout = vennLayout(data ?? []);

  return (
    <ChartFrame
      className={className}
      empty={!layout.ok}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        if (!layout.ok) {
          return null;
        }
        const scaleX = plot.width / 100;
        const scaleY = plot.height / 100;
        return (
          <>
            <svg
              aria-label={title ?? "Venn chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {layout.circles.map((circle, index) => {
                const size = (data ?? []).find(
                  (set) => set.sets.length === 1 && set.sets[0] === circle.id,
                );
                return (
                  <g key={circle.id}>
                    <ellipse
                      cx={circle.cx * scaleX}
                      cy={circle.cy * scaleY}
                      fill={seriesColor(token, index, layout.circles.length)}
                      fillOpacity={0.45}
                      rx={circle.r * scaleX}
                      ry={circle.r * scaleY}
                      style={{ cursor: "pointer" }}
                      onMouseMove={(event) => {
                        if (!tooltip) {
                          return;
                        }
                        const at = pointerIn(event);
                        interaction.showTip({
                          x: at.x,
                          y: at.y,
                          lines: [circle.id, formatMeasure(size?.size ?? 0)],
                        });
                      }}
                    />
                    <text
                      fill={token.colorText}
                      fontFamily={token.fontFamily}
                      fontSize={token.fontSizeSM}
                      fontWeight={token.fontWeightStrong}
                      textAnchor="middle"
                      x={circle.cx * scaleX}
                      y={circle.cy * scaleY}
                    >
                      {circle.id}
                    </text>
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
