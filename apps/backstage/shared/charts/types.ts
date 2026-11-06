export type Datum = Record<string, string | number | null | undefined>;

export type ChartTreeNode = {
  name: string;
  value?: number;
  children?: ChartTreeNode[];
};

export type SankeyDatum = {
  source: string;
  target: string;
  value: number;
};

export type VennDatum = {
  sets: string[];
  size: number;
};

export type WordDatum = {
  text: string;
  value: number;
};

export type ChartChromeProps = {
  title?: string;
  height?: number;
  loading?: boolean;
  legend?: boolean;
  tooltip?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export type ChartMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const PLOT_MARGIN: ChartMargin = {
  top: 12,
  right: 16,
  bottom: 32,
  left: 48,
};

export type PlotBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function plotBox(
  width: number,
  height: number,
  margin: ChartMargin = PLOT_MARGIN,
): PlotBox {
  return {
    x: margin.left,
    y: margin.top,
    width: Math.max(0, width - margin.left - margin.right),
    height: Math.max(0, height - margin.top - margin.bottom),
  };
}
