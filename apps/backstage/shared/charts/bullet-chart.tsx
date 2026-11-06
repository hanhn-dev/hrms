"use client";

import { theme } from "antd";
import { PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { ChartFrame } from "@/shared/charts/frame";
import { formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import { plotBox, type ChartChromeProps } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type BulletChartProps = ChartChromeProps & {
  measure?: number | null;
  target?: number | null;
  ranges?: readonly number[] | null;
};

export function BulletChart({
  measure,
  target,
  ranges,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: BulletChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const bands = (ranges ?? []).filter((value) => Number.isFinite(value) && value >= 0);
  const ready =
    measure != null &&
    Number.isFinite(measure) &&
    target != null &&
    Number.isFinite(target) &&
    bands.length > 0;
  const scale = linearScale([
    ...(ready ? [measure, target, ...bands] : []),
  ]);
  const fills = [token.colorFillTertiary, token.colorFillSecondary, token.colorPrimaryBg];

  return (
    <ChartFrame
      className={className}
      empty={!ready}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const box = plotBox(plot.width, plot.height, {
          top: 16,
          right: 16,
          bottom: 28,
          left: 16,
        });
        const ordered = [...bands].sort((left, right) => right - left);
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? "Bullet chart"}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              <ValueGrid axis="x" box={box} scale={scale} token={token} />
              {ordered.map((band, index) => (
                <rect
                  key={`${band}-${index}`}
                  fill={fills[Math.min(index, fills.length - 1)] ?? token.colorFillTertiary}
                  height={box.height}
                  width={scale.unit(band) * box.width}
                  x={box.x}
                  y={box.y}
                />
              ))}
              <rect
                fill={token.colorPrimary}
                height={box.height * 0.28}
                width={scale.unit(measure ?? 0) * box.width}
                x={box.x}
                y={box.y + box.height * 0.36}
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
                      `measure ${formatMeasure(measure ?? 0)}`,
                      `target ${formatMeasure(target ?? 0)}`,
                    ],
                  });
                }}
              />
              <line
                stroke={token.colorText}
                strokeWidth={2}
                x1={box.x + scale.unit(target ?? 0) * box.width}
                x2={box.x + scale.unit(target ?? 0) * box.width}
                y1={box.y + box.height * 0.2}
                y2={box.y + box.height * 0.8}
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
