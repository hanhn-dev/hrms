export type ChartColorTokens = {
  colorPrimary: string;
  blue: string;
  cyan: string;
  green: string;
  gold: string;
  orange: string;
  volcano: string;
  red: string;
  magenta: string;
  purple: string;
  geekblue: string;
  lime: string;
  blue1: string;
  blue2: string;
  blue3: string;
  blue4: string;
  blue5: string;
  blue6: string;
};

const SERIES_ORDER = [
  "blue",
  "cyan",
  "green",
  "gold",
  "orange",
  "volcano",
  "red",
  "magenta",
  "purple",
  "geekblue",
  "lime",
] as const satisfies readonly (keyof ChartColorTokens)[];

export function seriesColor(
  token: ChartColorTokens,
  index: number,
  count: number,
): string {
  if (count <= 1) {
    return token.colorPrimary;
  }
  const key = SERIES_ORDER[index % SERIES_ORDER.length] ?? "blue";
  return token[key];
}

export function heatmapColor(token: ChartColorTokens, unit: number): string {
  const steps = [
    token.blue1,
    token.blue2,
    token.blue3,
    token.blue4,
    token.blue5,
    token.blue6,
  ];
  const clamped = Math.min(1, Math.max(0, unit));
  const index = Math.round(clamped * (steps.length - 1));
  return steps[index] ?? token.blue1;
}
