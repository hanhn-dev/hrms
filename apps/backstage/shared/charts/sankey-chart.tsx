"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { sankeyLayout } from "@/shared/charts/layout";
import { px } from "@/shared/charts/path";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, SankeyDatum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type SankeyChartProps = ChartChromeProps & {
  data?: readonly SankeyDatum[] | null;
};

export function SankeyChart({
  data,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: SankeyChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const links = data ?? [];

  return (
    <ChartFrame
      className={className}
      empty={links.length === 0}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const inset = { left: 72, right: 56, top: 20, bottom: 8 };
        const layout = sankeyLayout(links, {
          width: Math.max(40, plot.width - inset.left - inset.right),
          height: Math.max(40, plot.height - inset.top - inset.bottom),
        });
        const byId = new Map(layout.nodes.map((node) => [node.id, node]));
        return (
          <>
            <svg
              aria-label={title ?? "Sankey chart"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              <g transform={`translate(${inset.left} ${inset.top})`}>
              {layout.links.map((link) => {
                const source = byId.get(link.source);
                const target = byId.get(link.target);
                if (!source || !target) {
                  return null;
                }
                const x1 = source.x + source.width;
                const x2 = target.x;
                const mid = (x1 + x2) / 2;
                const half = link.width / 2;
                const path = `M ${px(x1)} ${px(link.sourceY - half)} C ${px(mid)} ${px(link.sourceY - half)}, ${px(mid)} ${px(link.targetY - half)}, ${px(x2)} ${px(link.targetY - half)} L ${px(x2)} ${px(link.targetY + half)} C ${px(mid)} ${px(link.targetY + half)}, ${px(mid)} ${px(link.sourceY + half)}, ${px(x1)} ${px(link.sourceY + half)} Z`;
                return (
                  <path
                    key={`${link.source}-${link.target}`}
                    d={path}
                    fill={token.colorPrimary}
                    fillOpacity={0.28}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [`${link.source} → ${link.target}`, formatMeasure(link.value)],
                      });
                    }}
                  />
                );
              })}
              {layout.nodes.map((node) => (
                <g key={node.id}>
                  <rect
                    fill={token.colorPrimary}
                    height={Math.max(node.height, 1)}
                    width={node.width}
                    x={node.x}
                    y={node.y}
                  />
                  <text
                    fill={token.colorText}
                    fontFamily={token.fontFamily}
                    fontSize={token.fontSizeSM}
                    paintOrder="stroke"
                    stroke={token.colorBgContainer}
                    strokeWidth={4}
                    textAnchor="middle"
                    x={px(node.x + node.width / 2)}
                    y={px(node.y - 6)}
                  >
                    {node.id}
                  </text>
                </g>
              ))}
              </g>
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
