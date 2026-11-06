"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { treeValue } from "@/shared/charts/fields";
import { squarify, type Rect } from "@/shared/charts/layout";
import { seriesColor } from "@/shared/charts/palette";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, ChartTreeNode } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

type Tile = { name: string; value: number; rect: Rect; index: number };

function tilesOf(node: ChartTreeNode, bounds: Rect): Tile[] {
  const children = (node.children ?? []).filter((child) => treeValue(child) > 0);
  if (children.length === 0) {
    const value = treeValue(node);
    return value > 0 ? [{ name: node.name, value, rect: bounds, index: 0 }] : [];
  }
  const rects = squarify(
    children.map((child) => treeValue(child)),
    bounds,
  );
  return children.flatMap((child, index) => {
    const rect = rects[index];
    if (!rect) {
      return [];
    }
    const nested = child.children?.some((item) => treeValue(item) > 0);
    if (nested) {
      return tilesOf(child, rect).map((tile) => ({ ...tile, index }));
    }
    return [{ name: child.name, value: treeValue(child), rect, index }];
  });
}

export type TreemapChartProps = ChartChromeProps & {
  data?: ChartTreeNode | null;
};

export function TreemapChart({
  data,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: TreemapChartProps): React.JSX.Element {
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
        const tiles = data
          ? tilesOf(data, { x: 0, y: 0, width: plot.width, height: plot.height })
          : [];
        return (
          <>
            <svg
              aria-label={title ?? "Treemap"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {tiles.map((tile) => (
                <g key={`${tile.name}-${tile.index}`}>
                  <rect
                    fill={seriesColor(token, tile.index, Math.max(tiles.length, 1))}
                    height={Math.max(0, tile.rect.height - 2)}
                    width={Math.max(0, tile.rect.width - 2)}
                    x={tile.rect.x + 1}
                    y={tile.rect.y + 1}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [tile.name, formatMeasure(tile.value)],
                      });
                    }}
                  />
                  {tile.rect.width > 48 && tile.rect.height > 20 ? (
                    <text
                      fill={token.colorTextLightSolid}
                      fontFamily={token.fontFamily}
                      fontSize={token.fontSizeSM}
                      x={tile.rect.x + 8}
                      y={tile.rect.y + 18}
                    >
                      {tile.name}
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
