"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Lightweight fixed-row virtualizer (avoids a react-window install when the
 * monorepo npm graph cannot resolve workspace packages).
 */
export function VirtualList({
  rowCount,
  rowHeight,
  height,
  overscan = 4,
  rowRenderer,
}: {
  rowCount: number;
  rowHeight: number;
  height: number;
  overscan?: number;
  rowRenderer: (index: number, style: CSSProperties) => ReactNode;
}): React.JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = rowCount * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(height / rowHeight) + overscan * 2;
  const endIndex = Math.min(rowCount, startIndex + visibleCount);
  const rows: ReactNode[] = [];

  for (let index = startIndex; index < endIndex; index += 1) {
    rows.push(
      rowRenderer(index, {
        position: "absolute",
        top: index * rowHeight,
        left: 0,
        right: 0,
        height: rowHeight,
      }),
    );
  }

  return (
    <div
      style={{ height, overflow: "auto", position: "relative" }}
      onScroll={(event) => {
        setScrollTop(event.currentTarget.scrollTop);
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>{rows}</div>
    </div>
  );
}
