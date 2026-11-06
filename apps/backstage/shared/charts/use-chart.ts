"use client";

import { useState } from "react";

export type ChartTip = {
  x: number;
  y: number;
  lines: string[];
};

export function toggleHidden(
  hidden: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  const next = new Set(hidden);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function useChartInteraction(): {
  hidden: ReadonlySet<string>;
  toggle: (id: string) => void;
  tip: ChartTip | null;
  showTip: (tip: ChartTip) => void;
  hideTip: () => void;
} {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [tip, setTip] = useState<ChartTip | null>(null);
  return {
    hidden,
    toggle: (id: string) => {
      setHidden(toggleHidden(hidden, id));
    },
    tip,
    showTip: setTip,
    hideTip: () => {
      setTip(null);
    },
  };
}
