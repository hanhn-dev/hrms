"use client";

import { useId } from "react";
import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { px } from "@/shared/charts/path";
import type { ChartChromeProps } from "@/shared/charts/types";

export type LiquidChartProps = ChartChromeProps & {
  percent?: number | null;
};

function wavePath(width: number, height: number, level: number): string {
  const y = px(height * (1 - level));
  let path = `M 0 ${px(height)} L 0 ${y}`;
  const steps = 24;
  for (let index = 0; index <= steps; index += 1) {
    const x = px((width * index) / steps);
    const offset = px(Math.sin((index / steps) * Math.PI * 2) * Math.min(8, height * 0.04));
    path += ` L ${x} ${px(y + offset)}`;
  }
  path += ` L ${px(width)} ${px(height)} Z`;
  return path;
}

export function LiquidChart({
  percent,
  title,
  height,
  loading = false,
  legend = false,
  className,
  style,
}: LiquidChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const clipId = useId();
  const value =
    percent == null || !Number.isFinite(percent) ? null : Math.min(1, Math.max(0, percent));

  return (
    <ChartFrame
      className={className}
      empty={value == null}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const size = Math.max(16, Math.min(plot.width, plot.height) * 0.72);
        const x = (plot.width - size) / 2;
        const y = (plot.height - size) / 2;
        return (
          <svg aria-label={title ?? "Liquid chart"} height={plot.height} role="img" width={plot.width}>
            <defs>
              <clipPath id={clipId}>
                <circle cx={x + size / 2} cy={y + size / 2} r={size / 2} />
              </clipPath>
            </defs>
            <circle
              cx={x + size / 2}
              cy={y + size / 2}
              fill={token.blue1}
              r={size / 2}
              stroke={token.colorPrimary}
              strokeWidth={2}
            />
            <g clipPath={`url(#${clipId})`}>
              <path d={wavePath(plot.width, plot.height, value ?? 0)} fill={token.colorPrimary} />
            </g>
            <text
              fill={token.colorText}
              fontFamily={token.fontFamily}
              fontSize={token.fontSizeHeading4}
              fontWeight={token.fontWeightStrong}
              textAnchor="middle"
              x={plot.width / 2}
              y={plot.height / 2}
            >
              {`${Math.round((value ?? 0) * 100)}%`}
            </text>
          </svg>
        );
      }}
    </ChartFrame>
  );
}
