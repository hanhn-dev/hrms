export type Point = { x: number; y: number };

/** Stable across server and browser trigonometry. */
export function px(value: number): number {
  return Math.round(value * 100) / 100;
}

export function linePath(points: readonly Point[], smooth: boolean): string {
  const first = points[0];
  if (!first) {
    return "";
  }
  if (!smooth || points.length < 3) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${px(point.x)} ${px(point.y)}`)
      .join(" ");
  }
  let path = `M ${first.x} ${first.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(index - 1, 0)] ?? first;
    const current = points[index] ?? first;
    const next = points[index + 1] ?? current;
    const after = points[Math.min(index + 2, points.length - 1)] ?? next;
    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (after.x - current.x) / 6;
    const cp2y = next.y - (after.y - current.y) / 6;
    path += ` C ${px(cp1x)} ${px(cp1y)} ${px(cp2x)} ${px(cp2y)} ${px(next.x)} ${px(next.y)}`;
  }
  return path;
}

export function areaPath(
  points: readonly Point[],
  baseline: number,
  smooth: boolean,
): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return "";
  }
  return `${linePath(points, smooth)} L ${px(last.x)} ${px(baseline)} L ${px(first.x)} ${px(baseline)} Z`;
}

export function polar(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): Point {
  return {
    x: px(cx + Math.cos(angle) * radius),
    y: px(cy + Math.sin(angle) * radius),
  };
}

export function sectorPath(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  inner = 0,
): string {
  if (radius <= 0 || end <= start) {
    return "";
  }
  const large = end - start > Math.PI ? 1 : 0;
  const outerStart = polar(cx, cy, radius, start);
  const outerEnd = polar(cx, cy, radius, end);
  if (inner <= 0) {
    return `M ${px(cx)} ${px(cy)} L ${outerStart.x} ${outerStart.y} A ${px(radius)} ${px(radius)} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} Z`;
  }
  const innerStart = polar(cx, cy, inner, end);
  const innerEnd = polar(cx, cy, inner, start);
  return `M ${outerStart.x} ${outerStart.y} A ${px(radius)} ${px(radius)} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} L ${innerStart.x} ${innerStart.y} A ${px(inner)} ${px(inner)} 0 ${large} 0 ${innerEnd.x} ${innerEnd.y} Z`;
}

export function openArc(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
): string {
  if (radius <= 0 || end <= start) {
    return "";
  }
  const large = end - start > Math.PI ? 1 : 0;
  const from = polar(cx, cy, radius, start);
  const to = polar(cx, cy, radius, end);
  return `M ${from.x} ${from.y} A ${px(radius)} ${px(radius)} 0 ${large} 1 ${to.x} ${to.y}`;
}
