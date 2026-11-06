"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { openArc } from "@/shared/charts/path";
import type { ChartChromeProps } from "@/shared/charts/types";

export type GaugeThresholds = {
  success: number;
  warning: number;
};

function gaugeColor(
  token: {
    colorPrimary: string;
    colorSuccess: string;
    colorWarning: string;
    colorError: string;
  },
  percent: number,
  thresholds?: GaugeThresholds,
): string {
  if (!thresholds) {
    return token.colorPrimary;
  }
  if (percent >= thresholds.success) {
    return token.colorSuccess;
  }
  if (percent >= thresholds.warning) {
    return token.colorWarning;
  }
  return token.colorError;
}

export type GaugeChartProps = ChartChromeProps & {
  percent?: number | null;
  thresholds?: GaugeThresholds;
};

export function GaugeChart({
  percent,
  thresholds,
  title,
  height,
  loading = false,
  legend = false,
  className,
  style,
}: GaugeChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const value = percent == null || !Number.isFinite(percent) ? null : Math.min(1, Math.max(0, percent));
  const start = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;

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
        const cx = plot.width / 2;
        const cy = plot.height * 0.62;
        const radius = Math.max(16, Math.min(plot.width, plot.height) * 0.34);
        const color = gaugeColor(token, value ?? 0, thresholds);
        return (
          <svg aria-label={title ?? "Gauge"} height={plot.height} role="img" width={plot.width}>
            <path
              d={openArc(cx, cy, radius, start, start + sweep)}
              fill="none"
              stroke={token.colorFillSecondary}
              strokeLinecap="round"
              strokeWidth={12}
            />
            <path
              d={openArc(cx, cy, radius, start, start + sweep * (value ?? 0))}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeWidth={12}
              style={{ transition: `stroke ${token.motionDurationFast}` }}
            />
            <text
              fill={token.colorText}
              fontFamily={token.fontFamily}
              fontSize={token.fontSizeHeading3}
              fontWeight={token.fontWeightStrong}
              textAnchor="middle"
              x={cx}
              y={cy}
            >
              {`${Math.round((value ?? 0) * 100)}%`}
            </text>
          </svg>
        );
      }}
    </ChartFrame>
  );
}
