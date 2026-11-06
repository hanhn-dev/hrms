import type { ChartTreeNode, SankeyDatum, VennDatum } from "@/shared/charts/types";
import { finiteNumbers } from "@/shared/charts/scale";
import { treeValue } from "@/shared/charts/fields";

export type HistogramBin = {
  start: number;
  end: number;
  count: number;
};

export type QuartileSummary = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SankeyNodeLayout = {
  id: string;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
};

export type SankeyLinkLayout = {
  source: string;
  target: string;
  value: number;
  width: number;
  sourceY: number;
  targetY: number;
};

export type SunburstArc = {
  name: string;
  depth: number;
  start: number;
  end: number;
  value: number;
};

export type PackedCircle = {
  name: string;
  cx: number;
  cy: number;
  r: number;
  depth: number;
};

export type VennLayout =
  | { ok: false; reason: "empty" | "too-many-sets" }
  | {
      ok: true;
      circles: { id: string; cx: number; cy: number; r: number }[];
    };

export type WordBox = {
  text: string;
  width: number;
  height: number;
};

export type PlacedWord = WordBox & {
  x: number;
  y: number;
  placed: boolean;
};

export type WaterfallStep = {
  label: string;
  value: number;
  start: number;
  end: number;
  total: boolean;
};

export function histogramBins(
  values: readonly number[],
  binCount: number,
): HistogramBin[] {
  const finite = finiteNumbers(values);
  const count = Math.max(1, Math.floor(binCount) || 1);
  if (finite.length === 0) {
    return [];
  }
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const width = (max - min) / count;
  const bins: HistogramBin[] = Array.from({ length: count }, (_, index) => ({
    start: min + index * width,
    end: min + (index + 1) * width,
    count: 0,
  }));
  for (const value of finite) {
    let index = Math.floor((value - min) / width);
    if (index >= count) {
      index = count - 1;
    }
    if (index < 0) {
      index = 0;
    }
    const bin = bins[index];
    if (bin) {
      bin.count += 1;
    }
  }
  return bins;
}

export function percentile(sorted: readonly number[], ratio: number): number {
  const first = sorted[0];
  if (first == null) {
    return Number.NaN;
  }
  if (sorted.length === 1) {
    return first;
  }
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const left = sorted[lower] ?? first;
  const right = sorted[upper] ?? left;
  if (lower === upper) {
    return left;
  }
  const weight = position - lower;
  return left * (1 - weight) + right * weight;
}

export function quartiles(values: readonly number[]): QuartileSummary | null {
  const sorted = finiteNumbers(values).sort((left, right) => left - right);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first == null || last == null) {
    return null;
  }
  return {
    min: first,
    q1: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    q3: percentile(sorted, 0.75),
    max: last,
  };
}

export function kernelDensity(
  values: readonly number[],
  samples = 32,
): { x: number; y: number }[] {
  const finite = finiteNumbers(values);
  const count = Math.max(2, samples);
  if (finite.length === 0) {
    return [];
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const variance =
    finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / finite.length;
  const deviation = Math.sqrt(variance);
  const bandwidth = 1.06 * (deviation || span / 4) * finite.length ** (-1 / 5);
  const safeBandwidth = bandwidth > 0 ? bandwidth : span / 10;
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = min + (span * index) / (count - 1);
    let density = 0;
    for (const value of finite) {
      const z = (x - value) / safeBandwidth;
      density += Math.exp(-0.5 * z * z);
    }
    density /= finite.length * safeBandwidth * Math.sqrt(2 * Math.PI);
    points.push({ x, y: density });
  }
  return points;
}

function worstRatio(row: readonly number[], length: number): number {
  if (row.length === 0 || length <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const sum = row.reduce((total, area) => total + area, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const sumSquared = sum * sum;
  const lengthSquared = length * length;
  return Math.max((lengthSquared * max) / sumSquared, sumSquared / (lengthSquared * min));
}

function layoutRow(
  row: readonly number[],
  box: { x: number; y: number; w: number; h: number },
  out: Rect[],
): { x: number; y: number; w: number; h: number } {
  const sum = row.reduce((total, area) => total + area, 0);
  if (box.w >= box.h) {
    const rowWidth = box.h === 0 ? 0 : sum / box.h;
    let y = box.y;
    for (const area of row) {
      const height = rowWidth === 0 ? 0 : area / rowWidth;
      out.push({ x: box.x, y, width: rowWidth, height });
      y += height;
    }
    return { x: box.x + rowWidth, y: box.y, w: box.w - rowWidth, h: box.h };
  }
  const rowHeight = box.w === 0 ? 0 : sum / box.w;
  let x = box.x;
  for (const area of row) {
    const width = rowHeight === 0 ? 0 : area / rowHeight;
    out.push({ x, y: box.y, width, height: rowHeight });
    x += width;
  }
  return { x: box.x, y: box.y + rowHeight, w: box.w, h: box.h - rowHeight };
}

export function squarify(values: readonly number[], bounds: Rect): Rect[] {
  const positive = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (total <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return [];
  }
  const area = bounds.width * bounds.height;
  const areas = positive.filter((value) => value > 0).map((value) => (value / total) * area);
  const out: Rect[] = [];
  let box = { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height };
  let row: number[] = [];
  for (const next of areas) {
    const side = Math.min(box.w, box.h);
    if (row.length === 0 || worstRatio([...row, next], side) <= worstRatio(row, side)) {
      row.push(next);
    } else {
      box = layoutRow(row, box, out);
      row = [next];
    }
  }
  if (row.length > 0) {
    layoutRow(row, box, out);
  }
  return out;
}

export function sankeyLayout(
  links: readonly SankeyDatum[],
  size: { width: number; height: number },
): { nodes: SankeyNodeLayout[]; links: SankeyLinkLayout[] } {
  const clean = links.filter(
    (link) =>
      link.source.length > 0 &&
      link.target.length > 0 &&
      link.source !== link.target &&
      Number.isFinite(link.value) &&
      link.value > 0,
  );
  if (clean.length === 0) {
    return { nodes: [], links: [] };
  }

  const ids = [...new Set(clean.flatMap((link) => [link.source, link.target]))];
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const id of ids) {
    incoming.set(id, 0);
    outgoing.set(id, 0);
  }
  for (const link of clean) {
    outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + link.value);
    incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value);
  }
  const flow = (id: string): number =>
    Math.max(incoming.get(id) ?? 0, outgoing.get(id) ?? 0);

  const column = new Map<string, number>(ids.map((id) => [id, 0]));
  for (let guard = 0; guard < ids.length; guard += 1) {
    let changed = false;
    for (const link of clean) {
      const next = (column.get(link.source) ?? 0) + 1;
      if ((column.get(link.target) ?? 0) < next) {
        column.set(link.target, next);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }

  const maxColumn = Math.max(...[...column.values()]);
  const nodeWidth = Math.min(16, size.width / 6);
  const gapX = maxColumn === 0 ? 0 : (size.width - nodeWidth) / maxColumn;
  const paddingY = 8;
  const nodeGap = 8;
  const usable = Math.max(1, size.height - paddingY * 2);
  const byColumn = new Map<number, string[]>();
  for (const id of ids) {
    const col = column.get(id) ?? 0;
    const list = byColumn.get(col) ?? [];
    list.push(id);
    byColumn.set(col, list);
  }

  const nodes: SankeyNodeLayout[] = [];
  for (const [col, list] of byColumn) {
    list.sort((left, right) => left.localeCompare(right));
    const total = list.reduce((sum, id) => sum + flow(id), 0);
    const gaps = nodeGap * Math.max(0, list.length - 1);
    const scale = total > 0 ? Math.max(0, usable - gaps) / total : 0;
    let y = paddingY;
    for (const id of list) {
      const value = flow(id);
      const height = value * scale;
      nodes.push({
        id,
        column: col,
        x: col * gapX,
        y,
        width: nodeWidth,
        height,
        value,
      });
      y += height + nodeGap;
    }
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sourceCursor = new Map(nodes.map((node) => [node.id, node.y]));
  const targetCursor = new Map(nodes.map((node) => [node.id, node.y]));
  const laid: SankeyLinkLayout[] = [];
  for (const link of clean) {
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    if (!source || !target) {
      continue;
    }
    const width = source.value > 0 ? (link.value / source.value) * source.height : 0;
    const targetWidth = target.value > 0 ? (link.value / target.value) * target.height : 0;
    const sourceY = sourceCursor.get(link.source) ?? source.y;
    const targetY = targetCursor.get(link.target) ?? target.y;
    sourceCursor.set(link.source, sourceY + width);
    targetCursor.set(link.target, targetY + targetWidth);
    laid.push({
      source: link.source,
      target: link.target,
      value: link.value,
      width,
      sourceY: sourceY + width / 2,
      targetY: targetY + targetWidth / 2,
    });
  }

  return { nodes, links: laid };
}

export function sunburstArcs(root: ChartTreeNode): SunburstArc[] {
  const total = treeValue(root);
  if (total <= 0) {
    return [];
  }
  const arcs: SunburstArc[] = [];
  const walk = (
    node: ChartTreeNode,
    start: number,
    end: number,
    depth: number,
  ): void => {
    const value = treeValue(node);
    if (value <= 0) {
      return;
    }
    if (depth > 0) {
      arcs.push({ name: node.name, depth, start, end, value });
    }
    const children = node.children ?? [];
    if (children.length === 0) {
      return;
    }
    let cursor = start;
    for (const child of children) {
      const childValue = treeValue(child);
      if (childValue <= 0) {
        continue;
      }
      const sweep = ((end - start) * childValue) / value;
      walk(child, cursor, cursor + sweep, depth + 1);
      cursor += sweep;
    }
  };
  walk(root, 0, Math.PI * 2, 0);
  return arcs;
}

function packSiblings(
  children: readonly ChartTreeNode[],
  parentRadius: number,
): { name: string; cx: number; cy: number; r: number }[] {
  const sized = children
    .map((child) => ({ name: child.name, value: treeValue(child) }))
    .filter((child) => child.value > 0);
  if (sized.length === 0 || parentRadius <= 0) {
    return [];
  }
  const placed: { name: string; cx: number; cy: number; r: number }[] = [];
  for (const child of sized) {
    const radius = Math.sqrt(child.value);
    if (placed.length === 0) {
      placed.push({ name: child.name, cx: 0, cy: 0, r: radius });
      continue;
    }
    let found = false;
    for (let step = 0; step < 2400; step += 1) {
      const angle = step * 0.45;
      const orbit = 1.6 * Math.sqrt(step);
      const cx = Math.cos(angle) * orbit;
      const cy = Math.sin(angle) * orbit;
      const hits = placed.some((other) => {
        return Math.hypot(other.cx - cx, other.cy - cy) < other.r + radius - 0.01;
      });
      if (!hits) {
        placed.push({ name: child.name, cx, cy, r: radius });
        found = true;
        break;
      }
    }
    if (!found) {
      placed.push({ name: child.name, cx: 0, cy: 0, r: radius });
    }
  }
  let extent = 0;
  for (const circle of placed) {
    extent = Math.max(extent, Math.hypot(circle.cx, circle.cy) + circle.r);
  }
  const scale = extent > 0 ? (parentRadius * 0.92) / extent : 1;
  return placed.map((circle) => ({
    name: circle.name,
    cx: circle.cx * scale,
    cy: circle.cy * scale,
    r: circle.r * scale,
  }));
}

export function packCircles(root: ChartTreeNode, rootRadius: number): PackedCircle[] {
  if (rootRadius <= 0) {
    return [];
  }
  const circles: PackedCircle[] = [
    { name: root.name, cx: 0, cy: 0, r: rootRadius, depth: 0 },
  ];
  const visit = (
    node: ChartTreeNode,
    cx: number,
    cy: number,
    radius: number,
    depth: number,
  ): void => {
    const children = node.children ?? [];
    if (children.length === 0) {
      return;
    }
    const packed = packSiblings(children, radius);
    for (const circle of packed) {
      const child = children.find((item) => item.name === circle.name);
      if (!child) {
        continue;
      }
      const abs = { cx: cx + circle.cx, cy: cy + circle.cy, r: circle.r };
      circles.push({ name: child.name, ...abs, depth: depth + 1 });
      visit(child, abs.cx, abs.cy, abs.r, depth + 1);
    }
  };
  visit(root, 0, 0, rootRadius, 0);
  return circles;
}

export function vennLayout(sets: readonly VennDatum[]): VennLayout {
  const ids = [
    ...new Set(
      sets.flatMap((set) => set.sets.filter((id) => id.length > 0)),
    ),
  ];
  if (ids.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (ids.length > 3) {
    return { ok: false, reason: "too-many-sets" };
  }
  const singles = new Map<string, number>();
  for (const id of ids) {
    const match = sets.find(
      (set) => set.sets.length === 1 && set.sets[0] === id && set.size > 0,
    );
    singles.set(id, match?.size ?? 1);
  }
  const max = Math.max(...singles.values(), 1);
  const radius = (id: string): number => 16 + 18 * Math.sqrt((singles.get(id) ?? 1) / max);
  if (ids.length === 1) {
    const id = ids[0] ?? "";
    return { ok: true, circles: [{ id, cx: 50, cy: 50, r: radius(id) }] };
  }
  if (ids.length === 2) {
    const left = ids[0] ?? "";
    const right = ids[1] ?? "";
    const leftRadius = radius(left);
    const rightRadius = radius(right);
    return {
      ok: true,
      circles: [
        { id: left, cx: 40, cy: 50, r: leftRadius },
        { id: right, cx: 62, cy: 50, r: rightRadius },
      ],
    };
  }
  const [first, second, third] = ids;
  return {
    ok: true,
    circles: [
      { id: first ?? "", cx: 50, cy: 38, r: radius(first ?? "") },
      { id: second ?? "", cx: 36, cy: 62, r: radius(second ?? "") },
      { id: third ?? "", cx: 64, cy: 62, r: radius(third ?? "") },
    ],
  };
}

function boxesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function placeWords(
  words: readonly WordBox[],
  bounds: { width: number; height: number },
): PlacedWord[] {
  const placed: PlacedWord[] = [];
  const cx = bounds.width / 2;
  const cy = bounds.height / 2;
  for (const word of words) {
    let chosen: { x: number; y: number } | null = null;
    for (let step = 0; step < 700; step += 1) {
      const angle = step * 0.45;
      const radius = 10 * Math.sqrt(step);
      const x = cx + Math.cos(angle) * radius - word.width / 2;
      const y = cy + Math.sin(angle) * radius * 0.62 - word.height / 2;
      if (
        x < 0 ||
        y < 0 ||
        x + word.width > bounds.width ||
        y + word.height > bounds.height
      ) {
        continue;
      }
      const candidate = { x, y, width: word.width, height: word.height };
      const overlaps = placed.some(
        (other) => other.placed && boxesOverlap(candidate, other),
      );
      if (!overlaps) {
        chosen = { x, y };
        break;
      }
    }
    placed.push({
      text: word.text,
      width: word.width,
      height: word.height,
      x: chosen?.x ?? 0,
      y: chosen?.y ?? 0,
      placed: chosen != null,
    });
  }
  return placed;
}

export function waterfallSteps(
  labels: readonly string[],
  values: readonly number[],
): WaterfallStep[] {
  const steps: WaterfallStep[] = [];
  let cursor = 0;
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      return;
    }
    const start = cursor;
    cursor += value;
    steps.push({
      label: labels[index] ?? "",
      value,
      start,
      end: cursor,
      total: false,
    });
  });
  if (steps.length === 0) {
    return [];
  }
  steps.push({
    label: "Total",
    value: cursor,
    start: 0,
    end: cursor,
    total: true,
  });
  return steps;
}
