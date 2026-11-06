"use client";

import { useEffect, useRef, useState } from "react";
import { Empty, Spin, theme } from "antd";
import type { ChartChromeProps } from "@/shared/charts/types";

export type LegendItem = {
  id: string;
  label: string;
  color: string;
};

export type PlotSize = {
  width: number;
  height: number;
};

export function ChartFrame({
  title,
  height = 320,
  loading = false,
  legend = true,
  className,
  style,
  empty,
  legendItems = [],
  hidden,
  onToggleLegend,
  children,
}: ChartChromeProps & {
  empty: boolean;
  legendItems?: LegendItem[];
  hidden?: ReadonlySet<string>;
  onToggleLegend?: (id: string) => void;
  children: (plot: PlotSize) => React.ReactNode;
}): React.JSX.Element {
  const { token } = theme.useToken();
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) {
        setWidth(Math.floor(next));
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const showLegend = legend && legendItems.length > 0;
  const titleSpace = title ? 28 : 0;
  const legendSpace = showLegend ? 32 : 0;
  const plotHeight = Math.max(32, height - titleSpace - legendSpace);
  const plotWidth = width > 0 ? width : 320;

  return (
    <div className={className} ref={frameRef} style={{ width: "100%", ...style }}>
      {title ? (
        <div
          style={{
            height: titleSpace,
            color: token.colorText,
            fontSize: token.fontSize,
            fontWeight: token.fontWeightStrong,
            lineHeight: `${titleSpace}px`,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ position: "relative", height: plotHeight }}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spin />
          </div>
        ) : empty ? (
          <div className="flex h-full items-center justify-center">
            <Empty description="No data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          children({ width: plotWidth, height: plotHeight })
        )}
      </div>
      {showLegend ? (
        <div
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          style={{ minHeight: legendSpace }}
        >
          {legendItems.map((item) => {
            const off = hidden?.has(item.id) ?? false;
            return (
              <button
                key={item.id}
                aria-pressed={!off}
                className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0"
                style={{
                  color: off ? token.colorTextDisabled : token.colorText,
                  fontSize: token.fontSizeSM,
                }}
                type="button"
                onClick={() => {
                  onToggleLegend?.(item.id);
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: token.borderRadiusSM,
                    background: item.color,
                    opacity: off ? 0.35 : 1,
                  }}
                />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
