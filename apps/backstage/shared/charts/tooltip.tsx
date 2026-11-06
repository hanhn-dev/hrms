"use client";

import { theme } from "antd";

export function pointerIn(event: React.MouseEvent<SVGElement>): { x: number; y: number } {
  const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget;
  const rect = svg.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function ChartTooltip({
  x,
  y,
  lines,
  bounds,
}: {
  x: number;
  y: number;
  lines: string[];
  bounds: { width: number; height: number };
}): React.JSX.Element {
  const { token } = theme.useToken();
  const left = x > bounds.width - 168 ? Math.max(0, x - 156) : x + 12;
  const top = Math.max(0, Math.min(y + 12, bounds.height - 8 - lines.length * 20));
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        zIndex: 2,
        maxWidth: 220,
        padding: "6px 8px",
        pointerEvents: "none",
        background: token.colorBgSpotlight,
        color: token.colorTextLightSolid,
        borderRadius: token.borderRadiusSM,
        fontSize: token.fontSizeSM,
        lineHeight: token.lineHeightSM,
      }}
    >
      {lines.map((line, index) => (
        <div key={`${index}-${line}`}>{line}</div>
      ))}
    </div>
  );
}
