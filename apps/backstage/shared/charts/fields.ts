import type { ChartTreeNode, Datum } from "@/shared/charts/types";

export function numberField(row: Datum, field: string): number | null {
  const value = row[field];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function labelField(row: Datum, field: string): string | null {
  const value = row[field];
  if (value == null || value === "") {
    return null;
  }
  return String(value);
}

export type SeriesModel = {
  categories: string[];
  series: { name: string; values: (number | null)[] }[];
};

export function readSeries(
  rows: readonly Datum[] | null | undefined,
  xField: string,
  yField: string,
  seriesField?: string,
): SeriesModel {
  const categories: string[] = [];
  const names: string[] = [];
  const lookup = new Map<string, number>();

  for (const row of rows ?? []) {
    const category = labelField(row, xField);
    const value = numberField(row, yField);
    if (category == null || value == null) {
      continue;
    }
    if (!categories.includes(category)) {
      categories.push(category);
    }
    const name = seriesField ? (labelField(row, seriesField) ?? "Value") : "Value";
    if (!names.includes(name)) {
      names.push(name);
    }
    lookup.set(`${name}\0${category}`, value);
  }

  return {
    categories,
    series: names.map((name) => ({
      name,
      values: categories.map((category) => lookup.get(`${name}\0${category}`) ?? null),
    })),
  };
}

export function readLabeledValues(
  rows: readonly Datum[] | null | undefined,
  labelKey: string,
  valueKey: string,
): { label: string; value: number }[] {
  const items: { label: string; value: number }[] = [];
  for (const row of rows ?? []) {
    const label = labelField(row, labelKey);
    const value = numberField(row, valueKey);
    if (label == null || value == null) {
      continue;
    }
    items.push({ label, value });
  }
  return items;
}

export function numericValues(
  data: readonly number[] | readonly Datum[] | null | undefined,
  field?: string,
): number[] {
  if (!data || data.length === 0) {
    return [];
  }
  if (typeof data[0] === "number") {
    return (data as readonly number[]).filter((value) => Number.isFinite(value));
  }
  if (!field) {
    return [];
  }
  const values: number[] = [];
  for (const row of data as readonly Datum[]) {
    const value = numberField(row, field);
    if (value != null) {
      values.push(value);
    }
  }
  return values;
}

export function groupNumbers(
  rows: readonly Datum[] | null | undefined,
  xField: string,
  yField: string,
): { category: string; values: number[] }[] {
  const groups: { category: string; values: number[] }[] = [];
  for (const row of rows ?? []) {
    const category = labelField(row, xField);
    const value = numberField(row, yField);
    if (category == null || value == null) {
      continue;
    }
    const existing = groups.find((group) => group.category === category);
    if (existing) {
      existing.values.push(value);
    } else {
      groups.push({ category, values: [value] });
    }
  }
  return groups;
}

export function treeValue(node: ChartTreeNode): number {
  if (node.children && node.children.length > 0) {
    return node.children.reduce((sum, child) => sum + treeValue(child), 0);
  }
  return Number.isFinite(node.value) && (node.value ?? 0) > 0 ? node.value! : 0;
}
