import { bandScale, type LinearScale } from "@/shared/charts/scale";
import type { PlotBox } from "@/shared/charts/types";

export type ColumnMark = {
  series: string;
  category: string;
  value: number;
  x: number;
  width: number;
  y0: number;
  y1: number;
};

export function columnMarks(input: {
  categories: readonly string[];
  series: readonly { name: string; values: readonly (number | null)[] }[];
  stacked: boolean;
  padding?: number;
}): ColumnMark[] {
  const bands = bandScale(input.categories, input.padding ?? 0.28);
  const marks: ColumnMark[] = [];
  if (input.stacked) {
    for (const band of bands) {
      const index = input.categories.indexOf(band.key);
      let positive = 0;
      let negative = 0;
      for (const series of input.series) {
        const value = series.values[index];
        if (value == null || !Number.isFinite(value) || value === 0) {
          continue;
        }
        const y0 = value > 0 ? positive : negative;
        const y1 = y0 + value;
        if (value > 0) {
          positive = y1;
        } else {
          negative = y1;
        }
        marks.push({
          series: series.name,
          category: band.key,
          value,
          x: band.start,
          width: band.size,
          y0,
          y1,
        });
      }
    }
    return marks;
  }

  const count = Math.max(input.series.length, 1);
  for (const band of bands) {
    const index = input.categories.indexOf(band.key);
    const slot = band.size / count;
    const inset = slot * 0.08;
    input.series.forEach((series, seriesIndex) => {
      const value = series.values[index];
      if (value == null || !Number.isFinite(value)) {
        return;
      }
      marks.push({
        series: series.name,
        category: band.key,
        value,
        x: band.start + seriesIndex * slot + inset,
        width: Math.max(0, slot - inset * 2),
        y0: 0,
        y1: value,
      });
    });
  }
  return marks;
}

export function markBelowBaseline(mark: ColumnMark, scale: LinearScale): boolean {
  return scale.unit(Math.min(mark.y0, mark.y1)) < scale.unit(0);
}

export function columnRect(
  mark: ColumnMark,
  box: PlotBox,
  scale: LinearScale,
  horizontal: boolean,
): { x: number; y: number; width: number; height: number } {
  if (horizontal) {
    const start = scale.unit(Math.min(mark.y0, mark.y1));
    const end = scale.unit(Math.max(mark.y0, mark.y1));
    return {
      x: box.x + start * box.width,
      y: box.y + mark.x * box.height,
      width: Math.max(0, (end - start) * box.width),
      height: mark.width * box.height,
    };
  }
  const top = scale.unit(Math.max(mark.y0, mark.y1));
  const bottom = scale.unit(Math.min(mark.y0, mark.y1));
  return {
    x: box.x + mark.x * box.width,
    y: box.y + (1 - top) * box.height,
    width: mark.width * box.width,
    height: Math.max(0, (top - bottom) * box.height),
  };
}
