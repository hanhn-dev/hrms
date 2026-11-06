export type LinearScale = {
  min: number;
  max: number;
  ticks: number[];
  /** 0 at min, 1 at max. */
  unit: (value: number) => number;
};

export type Band = {
  key: string;
  start: number;
  end: number;
  size: number;
};

export type PieSlice = {
  index: number;
  start: number;
  end: number;
  value: number;
};

function px(value: number): number {
  return Math.round(value * 100) / 100;
}

export function finiteNumbers(values: readonly number[]): number[] {
  return values.filter((value) => Number.isFinite(value));
}

export function niceStep(span: number, targetCount: number): number {
  if (!(span > 0) || !(targetCount > 0)) {
    return 1;
  }
  const rough = span / targetCount;
  const exponent = Math.floor(Math.log10(rough));
  const magnitude = 10 ** exponent;
  const fraction = rough / magnitude;
  const nice =
    fraction >= 7.5 ? 10 : fraction >= 3.5 ? 5 : fraction >= 1.5 ? 2 : 1;
  return nice * magnitude;
}

function tickPlaces(step: number): number {
  if (!Number.isFinite(step) || step >= 1) {
    return 0;
  }
  return Math.min(8, Math.ceil(-Math.log10(step)));
}

export function linearScale(
  values: readonly number[],
  tickCount = 4,
): LinearScale {
  const finite = finiteNumbers(values);
  if (finite.length === 0) {
    return { min: 0, max: 0, ticks: [], unit: () => 0 };
  }

  let low = Math.min(...finite);
  let high = Math.max(...finite);
  if (low > 0) {
    low = 0;
  }
  if (high < 0) {
    high = 0;
  }
  if (low === high) {
    if (low === 0) {
      high = 1;
    } else if (low > 0) {
      low = 0;
    } else {
      high = 0;
    }
  }

  const step = niceStep(high - low, tickCount);
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const places = tickPlaces(step);
  const steps = Math.max(1, Math.round((max - min) / step));
  const ticks: number[] = [];
  for (let index = 0; index <= steps; index += 1) {
    ticks.push(Number((min + index * step).toFixed(places)));
  }
  if (!ticks.includes(0) && min <= 0 && max >= 0) {
    ticks.push(0);
    ticks.sort((left, right) => left - right);
  }

  const span = max - min || 1;
  return {
    min,
    max,
    ticks,
    unit: (value) => (value - min) / span,
  };
}

export function bandScale(keys: readonly string[], padding = 0.28): Band[] {
  const unique: string[] = [];
  for (const key of keys) {
    if (!unique.includes(key)) {
      unique.push(key);
    }
  }
  if (unique.length === 0) {
    return [];
  }
  const step = 1 / unique.length;
  const size = step * (1 - padding);
  const inset = (step - size) / 2;
  return unique.map((key, index) => {
    const start = index * step + inset;
    return { key, start, end: start + size, size };
  });
}

export function pieSlices(values: readonly number[]): PieSlice[] {
  const positive = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return [];
  }
  let cursor = -Math.PI / 2;
  const slices: PieSlice[] = [];
  positive.forEach((value, index) => {
    if (value <= 0) {
      return;
    }
    const sweep = (value / total) * Math.PI * 2;
    slices.push({ index, start: cursor, end: cursor + sweep, value });
    cursor += sweep;
  });
  return slices;
}

export function radarPoint(
  index: number,
  count: number,
  radius: number,
): { x: number; y: number } {
  if (count <= 0) {
    return { x: 0, y: 0 };
  }
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  return {
    x: px(Math.cos(angle) * radius),
    y: px(Math.sin(angle) * radius),
  };
}

export function formatMeasure(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 10000 || abs < 0.01)) {
    return value.toExponential(1);
  }
  const digits =
    abs >= 100 || Number.isInteger(value) ? 0 : abs >= 10 ? 1 : 2;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}
