/** Past date window for employee history. */

/** Default calendar-day window when the operator has not picked dates. */
export const DEFAULT_HISTORY_LOOKBACK_DAYS = 90;

/** Cap for an explicit from→to span so a huge range cannot unbounded-load. */
export const MAX_HISTORY_LOOKBACK_DAYS = 3650; // ~10 years when operator picks dates

export type DateWindow = {
  /** Inclusive lower bound. */
  from: Date | null;
  /** Exclusive upper bound; null = no upper bound. */
  toExclusive: Date | null;
  fromIso: string | null;
  toIso: string | null;
  bounded: boolean;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDayBound(value: string, endOfDay: boolean): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (endOfDay) {
      return new Date(`${trimmed}T23:59:59.999Z`);
    }
    return new Date(`${trimmed}T00:00:00.000Z`);
  }
  return parsed;
}

export function resolveHistoryDateWindow(input: {
  from?: string | null;
  to?: string | null;
  now?: Date;
  defaultLookbackDays?: number;
  maxLookbackDays?: number;
}): DateWindow {
  const now = input.now ?? new Date();
  const defaultDays = input.defaultLookbackDays ?? DEFAULT_HISTORY_LOOKBACK_DAYS;
  const maxDays = input.maxLookbackDays ?? MAX_HISTORY_LOOKBACK_DAYS;

  const explicitFrom = input.from ? parseDayBound(input.from, false) : null;
  const explicitTo = input.to ? parseDayBound(input.to, true) : null;

  // Keep empty filters safe by showing the latest calendar-day window.
  if (!explicitFrom && !explicitTo) {
    const toExclusive = addUtcDays(startOfUtcDay(now), 1);
    const from = addUtcDays(startOfUtcDay(now), -(defaultDays - 1));
    return {
      from,
      toExclusive,
      fromIso: from.toISOString(),
      toIso: new Date(toExclusive.getTime() - 1).toISOString(),
      bounded: true,
    };
  }

  let from = explicitFrom;
  let toExclusive = explicitTo
    ? addUtcDays(startOfUtcDay(addUtcDays(explicitTo, 1)), 0)
    : addUtcDays(startOfUtcDay(now), 1);

  if (explicitTo && !explicitFrom) {
    from = addUtcDays(startOfUtcDay(explicitTo), -(maxDays - 1));
  }
  if (!from) {
    from = addUtcDays(startOfUtcDay(now), -maxDays);
  }

  if (explicitFrom && explicitTo) {
    const spanMs = toExclusive.getTime() - from.getTime();
    const maxMs = maxDays * 24 * 60 * 60 * 1000;
    if (spanMs > maxMs) {
      from = new Date(toExclusive.getTime() - maxMs);
    }
  }

  if (from.getTime() >= toExclusive.getTime()) {
    from = addUtcDays(toExclusive, -1);
  }

  return {
    from,
    toExclusive,
    fromIso: from.toISOString(),
    toIso: new Date(toExclusive.getTime() - 1).toISOString(),
    bounded: true,
  };
}

/** Keep event timestamps that fall inside an optional window. */
export function isTimestampInWindow(
  timeStamp: string,
  from: Date | null,
  toExclusive: Date | null,
): boolean {
  if (!from && !toExclusive) {
    return true;
  }
  const ms = new Date(timeStamp).getTime();
  if (Number.isNaN(ms)) {
    return false;
  }
  if (from && ms < from.getTime()) {
    return false;
  }
  if (toExclusive && ms >= toExclusive.getTime()) {
    return false;
  }
  return true;
}

export function compareTimeStampDesc(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? 1 : -1;
}
