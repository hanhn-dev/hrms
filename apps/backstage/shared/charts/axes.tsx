"use client";

import type { GlobalToken } from "antd/es/theme/interface";
import { formatMeasure, type LinearScale } from "@/shared/charts/scale";
import type { PlotBox } from "@/shared/charts/types";

function axisText(
  token: GlobalToken,
): {
  fill: string;
  fontSize: number;
  fontFamily: string;
} {
  return {
    fill: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
    fontFamily: token.fontFamily,
  };
}

export function ValueGrid({
  scale,
  box,
  token,
  axis,
}: {
  scale: LinearScale;
  box: PlotBox;
  token: GlobalToken;
  axis: "y" | "x";
}): React.JSX.Element {
  const text = axisText(token);
  return (
    <g>
      {scale.ticks.map((tick) => {
        if (axis === "y") {
          const y = box.y + box.height * (1 - scale.unit(tick));
          return (
            <g key={tick}>
              <line
                stroke={token.colorSplit}
                x1={box.x}
                x2={box.x + box.width}
                y1={y}
                y2={y}
              />
              <text
                dominantBaseline="middle"
                textAnchor="end"
                x={box.x - 8}
                y={y}
                {...text}
              >
                {formatMeasure(tick)}
              </text>
            </g>
          );
        }
        const x = box.x + scale.unit(tick) * box.width;
        return (
          <g key={tick}>
            <line
              stroke={token.colorSplit}
              x1={x}
              x2={x}
              y1={box.y}
              y2={box.y + box.height}
            />
            <text
              dominantBaseline="hanging"
              textAnchor="middle"
              x={x}
              y={box.y + box.height + 6}
              {...text}
            >
              {formatMeasure(tick)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function CategoryLabels({
  labels,
  box,
  token,
  axis,
}: {
  labels: readonly string[];
  box: PlotBox;
  token: GlobalToken;
  axis: "x" | "y";
}): React.JSX.Element {
  const text = axisText(token);
  const stride = labels.length > 12 ? 3 : labels.length > 8 ? 2 : 1;
  return (
    <g>
      {labels.map((label, index) => {
        if (index % stride !== 0) {
          return null;
        }
        if (axis === "x") {
          const x = box.x + ((index + 0.5) / labels.length) * box.width;
          return (
            <text
              key={`${label}-${index}`}
              textAnchor="middle"
              x={x}
              y={box.y + box.height + 16}
              {...text}
            >
              {label}
            </text>
          );
        }
        const y = box.y + ((index + 0.5) / labels.length) * box.height;
        return (
          <text
            key={`${label}-${index}`}
            dominantBaseline="middle"
            textAnchor="end"
            x={box.x - 8}
            y={y}
            {...text}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

export function PlotSvg({
  width,
  height,
  label,
  children,
  onLeave,
}: {
  width: number;
  height: number;
  label: string;
  children: React.ReactNode;
  onLeave?: () => void;
}): React.JSX.Element {
  return (
    <svg
      aria-label={label}
      height={height}
      role="img"
      width={width}
      onMouseLeave={onLeave}
    >
      {children}
    </svg>
  );
}
