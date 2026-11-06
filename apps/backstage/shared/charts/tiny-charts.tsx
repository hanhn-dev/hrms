"use client";

import { theme } from "antd";
import { TrendChart, type TrendChartProps } from "@/shared/charts/line-chart";
import { BarPlot, type BarPlotProps } from "@/shared/charts/column-chart";
import { ChartFrame } from "@/shared/charts/frame";
import type { ChartChromeProps } from "@/shared/charts/types";

type TinyTrendProps = Omit<TrendChartProps, "filled" | "axes">;
type TinyColumnProps = Omit<BarPlotProps, "horizontal" | "axes" | "stacked">;

export function TinyLine(props: TinyTrendProps): React.JSX.Element {
  return (
    <TrendChart
      {...props}
      axes={false}
      filled={false}
      height={props.height ?? 48}
      legend={props.legend ?? false}
    />
  );
}

export function TinyArea(props: TinyTrendProps): React.JSX.Element {
  return (
    <TrendChart
      {...props}
      axes={false}
      filled
      height={props.height ?? 48}
      legend={props.legend ?? false}
    />
  );
}

export function TinyColumn(props: TinyColumnProps): React.JSX.Element {
  return (
    <BarPlot
      {...props}
      axes={false}
      height={props.height ?? 48}
      horizontal={false}
      legend={props.legend ?? false}
    />
  );
}

export type TinyPercentProps = ChartChromeProps & {
  percent?: number | null;
};

function clampPercent(percent: number | null | undefined): number | null {
  if (percent == null || !Number.isFinite(percent)) {
    return null;
  }
  return Math.min(1, Math.max(0, percent));
}

export function TinyProgress({
  percent,
  title,
  height = 48,
  loading = false,
  legend = false,
  className,
  style,
}: TinyPercentProps): React.JSX.Element {
  const { token } = theme.useToken();
  const value = clampPercent(percent);
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
        const barHeight = 8;
        const y = plot.height / 2 - barHeight / 2;
        const width = Math.max(0, plot.width - 8);
        return (
          <svg aria-label={title ?? "Progress"} height={plot.height} role="img" width={plot.width}>
            <rect
              fill={token.colorFillSecondary}
              height={barHeight}
              rx={barHeight / 2}
              width={width}
              x={4}
              y={y}
            />
            <rect
              fill={token.colorPrimary}
              height={barHeight}
              rx={barHeight / 2}
              width={width * (value ?? 0)}
              x={4}
              y={y}
            />
          </svg>
        );
      }}
    </ChartFrame>
  );
}

export function TinyRing({
  percent,
  title,
  height = 48,
  loading = false,
  legend = false,
  className,
  style,
}: TinyPercentProps): React.JSX.Element {
  const { token } = theme.useToken();
  const value = clampPercent(percent);
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
        const size = Math.max(8, Math.min(plot.width, plot.height) - 8);
        const radius = size / 2 - 4;
        const cx = plot.width / 2;
        const cy = plot.height / 2;
        const circumference = 2 * Math.PI * radius;
        return (
          <svg aria-label={title ?? "Ring"} height={plot.height} role="img" width={plot.width}>
            <circle
              cx={cx}
              cy={cy}
              fill="none"
              r={radius}
              stroke={token.colorFillSecondary}
              strokeWidth={4}
            />
            <circle
              cx={cx}
              cy={cy}
              fill="none"
              r={radius}
              stroke={token.colorPrimary}
              strokeDasharray={`${circumference * (value ?? 0)} ${circumference}`}
              strokeLinecap="round"
              strokeWidth={4}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </svg>
        );
      }}
    </ChartFrame>
  );
}
