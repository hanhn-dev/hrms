import { z } from "zod";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRealDate(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const DateOnlySchema = z.string().refine(isRealDate, "Use a real calendar date");

export const RoadmapItemSchema = z.object({
  id: z.string().uuid(),
  workItemId: z.number().int().positive(),
  title: z.string().min(1),
  type: z.string().min(1).optional(),
  rank: z.number().int().min(1),
  startsOn: DateOnlySchema.optional(),
  endsOn: DateOnlySchema.optional(),
});

export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;

const LaneColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a lane color");

export const LANE_COLORS = [
  "#7c3aed",
  "#f43f5e",
  "#0f766e",
  "#ea580c",
  "#2563eb",
  "#a21caf",
  "#0369a1",
  "#b45309",
  "#15803d",
  "#be123c",
  "#4338ca",
  "#0e7490",
] as const;

export const RoadmapWindowSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    startsOn: DateOnlySchema,
    endsOn: DateOnlySchema,
    color: LaneColorSchema.optional(),
    items: z.array(RoadmapItemSchema),
  })
  .superRefine((window, ctx) => {
    if (window.endsOn < window.startsOn) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be on or after the start date",
        path: ["endsOn"],
      });
    }
    const ids = new Set<string>();
    const ranks = window.items.map((item) => item.rank).sort((a, b) => a - b);
    for (const item of window.items) {
      if (ids.has(item.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Work item ids must be unique within a window",
          path: ["items"],
        });
      }
      ids.add(item.id);
    }
    for (let index = 0; index < ranks.length; index += 1) {
      if (ranks[index] !== index + 1) {
        ctx.addIssue({
          code: "custom",
          message: "Ranks must start at 1 and increase by one",
          path: ["items"],
        });
        break;
      }
    }
    for (const item of window.items) {
      if ((item.startsOn == null) !== (item.endsOn == null)) {
        ctx.addIssue({
          code: "custom",
          message: "A work item needs both a start and an end date",
          path: ["items"],
        });
        continue;
      }
      if (!item.startsOn || !item.endsOn) {
        continue;
      }
      if (item.endsOn < item.startsOn) {
        ctx.addIssue({
          code: "custom",
          message: "End date must be on or after the start date",
          path: ["items"],
        });
      }
      if (item.startsOn < window.startsOn || item.endsOn > window.endsOn) {
        ctx.addIssue({
          code: "custom",
          message: "Work item dates must stay inside the time frame",
          path: ["items"],
        });
      }
    }
  });

export type RoadmapWindow = z.infer<typeof RoadmapWindowSchema>;

export const SprintLayoutSchema = z.object({
  sprintId: z.string().min(1),
  color: LaneColorSchema.optional(),
  hiddenWorkItemIds: z.array(z.number().int().positive()).default([]),
  items: z.array(RoadmapItemSchema),
});

export type SprintLayout = z.infer<typeof SprintLayoutSchema>;

export const RoadmapSchema = z
  .object({
    windows: z.array(RoadmapWindowSchema),
    sprintLayouts: z.array(SprintLayoutSchema).default([]),
  })
  .superRefine((roadmap, ctx) => {
    const windowIds = new Set<string>();
    const itemIds = new Set<string>();
    const adoIds = new Set<number>();
    for (const window of roadmap.windows) {
      if (windowIds.has(window.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Window ids must be unique",
          path: ["windows"],
        });
      }
      windowIds.add(window.id);
      for (const item of window.items) {
        if (itemIds.has(item.id) || adoIds.has(item.workItemId)) {
          ctx.addIssue({
            code: "custom",
            message: "A work item belongs to only one window",
            path: ["windows"],
          });
        }
        itemIds.add(item.id);
        adoIds.add(item.workItemId);
      }
    }
  });

export type Roadmap = z.infer<typeof RoadmapSchema>;

export type RoadmapWindowInput = {
  name: string;
  startsOn: string;
  endsOn: string;
};

export type RoadmapItemInput = {
  workItemId: number;
  title: string;
  type?: string;
};

export type TimelineMonth = {
  key: string;
  label: string;
  startsOn: string;
  endsOn: string;
  days: number;
};

/** One ISO date for each day in the month, from the first through the last. */
export function datesInMonth(month: Pick<TimelineMonth, "key" | "days">): string[] {
  const dates: string[] = [];
  for (let day = 1; day <= month.days; day += 1) {
    dates.push(`${month.key}-${String(day).padStart(2, "0")}`);
  }
  return dates;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const LANE_COLOR = /^#[0-9a-fA-F]{6}$/;

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = hue / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;
  if (sector < 1) {
    red = chroma;
    green = x;
  } else if (sector < 2) {
    red = x;
    green = chroma;
  } else if (sector < 3) {
    green = chroma;
    blue = x;
  } else if (sector < 4) {
    green = x;
    blue = chroma;
  } else if (sector < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }
  const match = l - chroma / 2;
  const channel = (value: number): string =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

/** First unused palette color, then a new hue so a lane does not repeat one already on the roadmap. */
export function nextLaneColor(used: readonly string[]): string {
  const taken = new Set(used.map((color) => color.toLowerCase()));
  const free = LANE_COLORS.find((color) => !taken.has(color));
  if (free) {
    return free;
  }
  let index = used.length;
  for (let attempt = 0; attempt < 360; attempt += 1) {
    const color = hslToHex(Math.round((index * 137.508) % 360), 62, 36);
    if (!taken.has(color)) {
      return color;
    }
    index += 1;
  }
  return hslToHex(Math.round((used.length * 137.508) % 360), 62, 36);
}

export function usedLaneColors(roadmap: Roadmap): string[] {
  const colors: string[] = [];
  for (const window of roadmap.windows) {
    if (window.color) {
      colors.push(window.color);
    }
  }
  for (const layout of roadmap.sprintLayouts) {
    if (layout.color) {
      colors.push(layout.color);
    }
  }
  return colors;
}

export function ensureLaneColors(roadmap: Roadmap): { roadmap: Roadmap; changed: boolean } {
  const used: string[] = [];
  let changed = false;
  const claim = (color: string | undefined): string => {
    const taken = used.some((existing) => existing.toLowerCase() === color?.toLowerCase());
    if (color && LANE_COLOR.test(color) && !taken) {
      used.push(color);
      return color;
    }
    const next = nextLaneColor(used);
    used.push(next);
    changed = true;
    return next;
  };
  const windows = roadmap.windows.map((window) => {
    const color = claim(window.color);
    return color === window.color ? window : { ...window, color };
  });
  const sprintLayouts = roadmap.sprintLayouts.map((layout) => {
    const color = claim(layout.color);
    return color === layout.color ? layout : { ...layout, color };
  });
  if (!changed) {
    return { roadmap, changed: false };
  }
  return { roadmap: { windows, sprintLayouts }, changed: true };
}

function yearMonth(iso: string): { year: number; month: number } {
  const [year, month] = iso.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 1 };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function utcDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000;
}

export function timelineMonths(
  windows: readonly {
    startsOn: string;
    endsOn: string;
    items?: readonly { startsOn?: string; endsOn?: string }[];
  }[],
): { start: string; end: string; months: TimelineMonth[] } | null {
  const spans: { startsOn: string; endsOn: string }[] = [];
  for (const window of windows) {
    spans.push({ startsOn: window.startsOn, endsOn: window.endsOn });
    for (const item of window.items ?? []) {
      if (item.startsOn && item.endsOn) {
        spans.push({ startsOn: item.startsOn, endsOn: item.endsOn });
      }
    }
  }
  if (spans.length === 0) {
    return null;
  }
  let start = yearMonth(spans[0]?.startsOn ?? "");
  let end = yearMonth(spans[0]?.endsOn ?? "");
  for (const span of spans) {
    const spanStart = yearMonth(span.startsOn);
    const spanEnd = yearMonth(span.endsOn);
    if (spanStart.year < start.year || (spanStart.year === start.year && spanStart.month < start.month)) {
      start = spanStart;
    }
    if (spanEnd.year > end.year || (spanEnd.year === end.year && spanEnd.month > end.month)) {
      end = spanEnd;
    }
  }
  const months: TimelineMonth[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    const days = daysInMonth(year, month);
    const key = monthKey(year, month);
    months.push({
      key,
      label: `${MONTH_LABELS[month - 1] ?? "Jan"} ${year}`,
      startsOn: `${key}-01`,
      endsOn: `${key}-${String(days).padStart(2, "0")}`,
      days,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const endMonth = end.month === 12 ? 1 : end.month + 1;
  const endYear = end.month === 12 ? end.year + 1 : end.year;
  return {
    start: `${monthKey(start.year, start.month)}-01`,
    end: `${monthKey(endYear, endMonth)}-01`,
    months,
  };
}

export function daySpan(startsOn: string, endsOn: string): number {
  return utcDay(endsOn) - utcDay(startsOn);
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function itemRange(
  item: { startsOn?: string; endsOn?: string },
  window: { startsOn: string; endsOn: string },
): { startsOn: string; endsOn: string } {
  return {
    startsOn: item.startsOn ?? window.startsOn,
    endsOn: item.endsOn ?? window.endsOn,
  };
}

export function daysFromPixels(
  deltaX: number,
  chartWidth: number,
  axisStart: string,
  axisEnd: string,
): number {
  const span = utcDay(axisEnd) - utcDay(axisStart);
  if (chartWidth <= 0 || span <= 0) {
    return 0;
  }
  return Math.round((deltaX / chartWidth) * span);
}

export function fitRange(
  startsOn: string,
  endsOn: string,
  boundStart: string,
  boundEnd: string,
): { startsOn: string; endsOn: string } {
  const length = utcDay(endsOn) - utcDay(startsOn);
  const boundLength = utcDay(boundEnd) - utcDay(boundStart);
  if (length >= boundLength) {
    return { startsOn: boundStart, endsOn: boundEnd };
  }
  let start = startsOn < boundStart ? boundStart : startsOn;
  let end = addDays(start, length);
  if (end > boundEnd) {
    end = boundEnd;
    start = addDays(end, -length);
  }
  if (start < boundStart) {
    start = boundStart;
  }
  return { startsOn: start, endsOn: end };
}

export function resizeEdge(
  startsOn: string,
  endsOn: string,
  edge: "start" | "end",
  dayDelta: number,
  boundStart: string,
  boundEnd: string,
): { startsOn: string; endsOn: string } {
  if (edge === "start") {
    let start = addDays(startsOn, dayDelta);
    if (start < boundStart) {
      start = boundStart;
    }
    if (start > endsOn) {
      start = endsOn;
    }
    if (start > boundEnd) {
      start = boundEnd;
    }
    return { startsOn: start, endsOn };
  }
  let end = addDays(endsOn, dayDelta);
  if (end > boundEnd) {
    end = boundEnd;
  }
  if (end < startsOn) {
    end = startsOn;
  }
  if (end < boundStart) {
    end = boundStart;
  }
  return { startsOn, endsOn: end };
}

export function barPercent(
  startsOn: string,
  endsOn: string,
  axisStart: string,
  axisEnd: string,
): { left: number; width: number } {
  const start = utcDay(axisStart);
  const end = utcDay(axisEnd);
  const span = end - start;
  if (span <= 0) {
    return { left: 0, width: 100 };
  }
  const barStart = utcDay(startsOn);
  const barEnd = utcDay(endsOn) + 1;
  return {
    left: Math.max(0, ((barStart - start) / span) * 100),
    width: Math.max(0, ((barEnd - barStart) / span) * 100),
  };
}

export function migrateRoadmapJson(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("windows" in value)) {
    return value;
  }
  const windows = (value as { windows?: unknown }).windows;
  if (!Array.isArray(windows)) {
    return value;
  }
  return {
    ...value,
    windows: windows.map((window) => {
      if (!window || typeof window !== "object" || !("items" in window)) {
        return window;
      }
      const items = (window as { items?: unknown }).items;
      if (!Array.isArray(items)) {
        return window;
      }
      return {
        ...window,
        items: items.map((item) => {
          if (!item || typeof item !== "object") {
            return item;
          }
          const record = item as { workItemId?: unknown; title?: unknown };
          if (typeof record.workItemId === "number") {
            return item;
          }
          const title = typeof record.title === "string" ? record.title.trim() : "";
          if (!/^\d+$/.test(title)) {
            return item;
          }
          const workItemId = Number(title);
          if (!Number.isSafeInteger(workItemId) || workItemId <= 0) {
            return item;
          }
          return { ...record, workItemId };
        }),
      };
    }),
  };
}

export function emptyRoadmap(): Roadmap {
  return { windows: [], sprintLayouts: [] };
}

export function orderedWindows(roadmap: Roadmap): RoadmapWindow[] {
  const windows = [...roadmap.windows].sort((left, right) => {
    const byStart = left.startsOn.localeCompare(right.startsOn);
    if (byStart !== 0) {
      return byStart;
    }
    return left.name.localeCompare(right.name);
  });
  let changed = windows.some((window, index) => window !== roadmap.windows[index]);
  const ordered = windows.map((window) => {
    const items = [...window.items].sort((left, right) => left.rank - right.rank);
    const sameItems = items.every((item, index) => item === window.items[index]);
    if (sameItems) {
      return window;
    }
    changed = true;
    return { ...window, items };
  });
  return changed ? ordered : roadmap.windows;
}

function commit(roadmap: {
  windows: Roadmap["windows"];
  sprintLayouts?: Roadmap["sprintLayouts"];
}): Roadmap {
  const result = RoadmapSchema.safeParse({
    windows: roadmap.windows,
    sprintLayouts: roadmap.sprintLayouts ?? [],
  });
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Roadmap is invalid";
    throw new Error(message);
  }
  return result.data;
}

function assertDates(startsOn: string, endsOn: string): void {
  if (!isRealDate(startsOn) || !isRealDate(endsOn)) {
    throw new Error("Use a real calendar date");
  }
  if (endsOn < startsOn) {
    throw new Error("End date must be on or after the start date");
  }
}

function checkedRange(startsOn: string, endsOn: string): { startsOn: string; endsOn: string } {
  assertDates(startsOn, endsOn);
  return { startsOn, endsOn };
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("Name is required");
  }
  return trimmed;
}

function requireTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error("Title is required");
  }
  return trimmed;
}

function findWindow(roadmap: Roadmap, windowId: string): RoadmapWindow {
  const window = roadmap.windows.find((candidate) => candidate.id === windowId);
  if (!window) {
    throw new Error("Window not found");
  }
  return window;
}

function findItemWindow(roadmap: Roadmap, itemId: string): RoadmapWindow {
  const window = roadmap.windows.find((candidate) =>
    candidate.items.some((item) => item.id === itemId),
  );
  if (!window) {
    throw new Error("Work item not found");
  }
  return window;
}

export function createWindow(
  roadmap: Roadmap,
  input: RoadmapWindowInput,
  id: string = crypto.randomUUID(),
): Roadmap {
  const name = requireName(input.name);
  assertDates(input.startsOn, input.endsOn);
  return commit({
    sprintLayouts: roadmap.sprintLayouts,
    windows: [
      ...roadmap.windows,
      {
        id,
        name,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        color: nextLaneColor(usedLaneColors(roadmap)),
        items: [],
      },
    ],
  });
}

export function updateWindow(
  roadmap: Roadmap,
  windowId: string,
  input: RoadmapWindowInput,
): Roadmap {
  findWindow(roadmap, windowId);
  const name = requireName(input.name);
  assertDates(input.startsOn, input.endsOn);
  return commit({
    sprintLayouts: roadmap.sprintLayouts,
    windows: roadmap.windows.map((window) => {
      if (window.id !== windowId) {
        return window;
      }
      return {
        ...window,
        name,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        items: window.items.map((item) => {
          if (!item.startsOn || !item.endsOn) {
            return item;
          }
          return { ...item, ...fitRange(item.startsOn, item.endsOn, input.startsOn, input.endsOn) };
        }),
      };
    }),
  });
}

export function deleteWindow(roadmap: Roadmap, windowId: string): Roadmap {
  findWindow(roadmap, windowId);
  return commit({
    sprintLayouts: roadmap.sprintLayouts,
    windows: roadmap.windows.filter((window) => window.id !== windowId),
  });
}

export function createItem(
  roadmap: Roadmap,
  windowId: string,
  input: RoadmapItemInput,
  id: string = crypto.randomUUID(),
): Roadmap {
  const window = findWindow(roadmap, windowId);
  if (!Number.isSafeInteger(input.workItemId) || input.workItemId <= 0) {
    throw new Error("Enter a work item id");
  }
  const alreadyPlaced = roadmap.windows.some((candidate) =>
    candidate.items.some((item) => item.workItemId === input.workItemId),
  );
  if (alreadyPlaced) {
    throw new Error(`Work item ${input.workItemId} is already on the roadmap`);
  }
  const title = requireTitle(input.title);
  const type = input.type?.trim();
  return commit({
    sprintLayouts: roadmap.sprintLayouts,
    windows: roadmap.windows.map((candidate) =>
      candidate.id === window.id
        ? {
            ...candidate,
            items: [
              ...candidate.items,
              {
                id,
                workItemId: input.workItemId,
                title,
                rank: candidate.items.length + 1,
                ...(type ? { type } : {}),
              },
            ],
          }
        : candidate,
    ),
  });
}

export function scheduleItem(
  roadmap: Roadmap,
  itemId: string,
  startsOn: string,
  endsOn: string,
): Roadmap {
  const window = findItemWindow(roadmap, itemId);
  assertDates(startsOn, endsOn);
  if (startsOn < window.startsOn || endsOn > window.endsOn) {
    throw new Error("Work item dates must stay inside the time frame");
  }
  return commit({
    sprintLayouts: roadmap.sprintLayouts,
    windows: roadmap.windows.map((candidate) =>
      candidate.id === window.id
        ? {
            ...candidate,
            items: candidate.items.map((item) =>
              item.id === itemId ? { ...item, startsOn, endsOn } : item,
            ),
          }
        : candidate,
    ),
  });
}

export function removeItem(roadmap: Roadmap, itemId: string): Roadmap {
  const window = findItemWindow(roadmap, itemId);
  return commit({
    sprintLayouts: roadmap.sprintLayouts,
    windows: roadmap.windows.map((candidate) => {
      if (candidate.id !== window.id) {
        return candidate;
      }
      const remaining = candidate.items
        .filter((item) => item.id !== itemId)
        .sort((a, b) => a.rank - b.rank)
        .map((item, index) => ({ ...item, rank: index + 1 }));
      return { ...candidate, items: remaining };
    }),
  });
}

function renumber(items: readonly RoadmapItem[]): RoadmapItem[] {
  return items.map((item, index) => ({ ...item, rank: index + 1 }));
}

function withRange(
  item: RoadmapItem,
  range: { startsOn: string; endsOn: string } | undefined,
  bounds: { startsOn: string; endsOn: string },
): RoadmapItem {
  if (range) {
    return { ...item, ...fitRange(range.startsOn, range.endsOn, bounds.startsOn, bounds.endsOn) };
  }
  if (!item.startsOn || !item.endsOn) {
    return item;
  }
  if (item.startsOn >= bounds.startsOn && item.endsOn <= bounds.endsOn) {
    return item;
  }
  return { ...item, ...fitRange(item.startsOn, item.endsOn, bounds.startsOn, bounds.endsOn) };
}

export function placeItem(
  roadmap: Roadmap,
  itemId: string,
  targetWindowId: string,
  targetIndex: number,
  range?: { startsOn: string; endsOn: string },
): Roadmap {
  const source = findItemWindow(roadmap, itemId);
  const target = findWindow(roadmap, targetWindowId);
  const moving = source.items.find((item) => item.id === itemId);
  if (!moving) {
    throw new Error("Work item not found");
  }
  const placed = withRange(moving, range, target);
  if (source.id === target.id) {
    const ordered = [...source.items].sort((a, b) => a.rank - b.rank);
    const from = ordered.findIndex((item) => item.id === itemId);
    const unchanged =
      from === targetIndex &&
      placed.startsOn === moving.startsOn &&
      placed.endsOn === moving.endsOn;
    if (unchanged) {
      return roadmap;
    }
    const next = [...ordered];
    const [item] = next.splice(from, 1);
    if (!item) {
      return roadmap;
    }
    const index = from === targetIndex ? from : Math.min(Math.max(targetIndex, 0), next.length);
    next.splice(index, 0, placed);
    return commit({
      sprintLayouts: roadmap.sprintLayouts,
      windows: roadmap.windows.map((window) =>
        window.id === source.id ? { ...window, items: renumber(next) } : window,
      ),
    });
  }
  const sourceRest = renumber(
    source.items.filter((item) => item.id !== itemId).sort((a, b) => a.rank - b.rank),
  );
  const targetOrdered = [...target.items].sort((a, b) => a.rank - b.rank);
  const index = Math.min(Math.max(targetIndex, 0), targetOrdered.length);
  const inserted = renumber([
    ...targetOrdered.slice(0, index),
    placed,
    ...targetOrdered.slice(index),
  ]);
  return commit({
    sprintLayouts: roadmap.sprintLayouts,
    windows: roadmap.windows.map((window) => {
      if (window.id === source.id) {
        return { ...window, items: sourceRest };
      }
      if (window.id === target.id) {
        return { ...window, items: inserted };
      }
      return window;
    }),
  });
}

function findSprintItem(
  roadmap: Roadmap,
  itemId: string,
): { layout: SprintLayout; item: RoadmapItem } {
  for (const layout of roadmap.sprintLayouts) {
    const item = layout.items.find((candidate) => candidate.id === itemId);
    if (item) {
      return { layout, item };
    }
  }
  throw new Error("Work item not found");
}

function sameSprintLayout(saved: SprintLayout | undefined, layout: SprintLayout): boolean {
  if (!saved || saved.sprintId !== layout.sprintId) {
    return false;
  }
  if (saved.hiddenWorkItemIds.length !== layout.hiddenWorkItemIds.length) {
    return false;
  }
  if (saved.color !== layout.color) {
    return false;
  }
  if (saved.hiddenWorkItemIds.some((id, index) => id !== layout.hiddenWorkItemIds[index])) {
    return false;
  }
  if (saved.items.length !== layout.items.length) {
    return false;
  }
  return saved.items.every((item, index) => {
    const next = layout.items[index];
    return (
      next != null &&
      item.id === next.id &&
      item.workItemId === next.workItemId &&
      item.title === next.title &&
      item.type === next.type &&
      item.rank === next.rank &&
      item.startsOn === next.startsOn &&
      item.endsOn === next.endsOn
    );
  });
}

/**
 * Keep Backstage rank and dates for the parents still in the sprint.
 * New parents are appended with no dates. Azure dates are applied in memory
 * on load and are not stored here. The work item type is stored so the bar
 * keeps its color. Hidden ids stay hidden. Nothing here is
 * written to Azure DevOps.
 */
function parentType(
  parent: { type?: string },
  saved: string | undefined,
): { type: string } | Record<string, never> {
  const type = parent.type?.trim() || saved;
  return type ? { type } : {};
}

export function mergeSprintLayout(
  saved: SprintLayout | undefined,
  sprintId: string,
  parents: readonly { id: number; title: string; type?: string }[],
  _bounds: { startsOn: string; endsOn: string },
  createId: () => string = () => crypto.randomUUID(),
  usedColors: readonly string[] = [],
): { layout: SprintLayout; changed: boolean } {
  const hiddenIds = saved?.hiddenWorkItemIds ?? [];
  const hidden = new Set(hiddenIds);
  const visible = parents.filter((parent) => !hidden.has(parent.id));
  const byId = new Map(visible.map((parent) => [parent.id, parent]));
  const kept: RoadmapItem[] = [];
  const seen = new Set<number>();
  for (const item of [...(saved?.items ?? [])].sort((left, right) => left.rank - right.rank)) {
    const parent = byId.get(item.workItemId);
    if (!parent || seen.has(item.workItemId)) {
      continue;
    }
    seen.add(item.workItemId);
    const dated = item.startsOn && item.endsOn
      ? { startsOn: item.startsOn, endsOn: item.endsOn }
      : null;
    kept.push({
      id: item.id,
      workItemId: item.workItemId,
      title: parent.title,
      rank: kept.length + 1,
      ...parentType(parent, item.type),
      ...(dated ? dated : {}),
    });
  }
  const newcomers = visible
    .filter((parent) => !seen.has(parent.id))
    .sort((left, right) => left.id - right.id);
  for (const parent of newcomers) {
    kept.push({
      id: createId(),
      workItemId: parent.id,
      title: parent.title,
      rank: kept.length + 1,
      ...parentType(parent, undefined),
    });
  }
  const color = saved?.color && LANE_COLOR.test(saved.color) ? saved.color : nextLaneColor(usedColors);
  const layout: SprintLayout = {
    sprintId,
    color,
    hiddenWorkItemIds: hiddenIds.filter((id) => parents.some((parent) => parent.id === id)),
    items: kept,
  };
  return { layout, changed: !sameSprintLayout(saved, layout) };
}

export function saveSprintLayout(roadmap: Roadmap, layout: SprintLayout): Roadmap {
  const exists = roadmap.sprintLayouts.some((candidate) => candidate.sprintId === layout.sprintId);
  return commit({
    windows: roadmap.windows,
    sprintLayouts: exists
      ? roadmap.sprintLayouts.map((candidate) =>
          candidate.sprintId === layout.sprintId ? layout : candidate,
        )
      : [...roadmap.sprintLayouts, layout],
  });
}

export function scheduleSprintItem(
  roadmap: Roadmap,
  itemId: string,
  startsOn: string,
  endsOn: string,
  bounds: { startsOn: string; endsOn: string },
): Roadmap {
  const { layout } = findSprintItem(roadmap, itemId);
  assertDates(startsOn, endsOn);
  assertDates(bounds.startsOn, bounds.endsOn);
  return commit({
    windows: roadmap.windows,
    sprintLayouts: roadmap.sprintLayouts.map((candidate) =>
      candidate.sprintId === layout.sprintId
        ? {
            ...candidate,
            items: candidate.items.map((item) =>
              item.id === itemId ? { ...item, startsOn, endsOn } : item,
            ),
          }
        : candidate,
    ),
  });
}

export function placeSprintItem(
  roadmap: Roadmap,
  itemId: string,
  sprintId: string,
  targetIndex: number,
  bounds: { startsOn: string; endsOn: string },
  range?: { startsOn: string; endsOn: string },
): Roadmap {
  const { layout, item } = findSprintItem(roadmap, itemId);
  if (layout.sprintId !== sprintId) {
    throw new Error("Work items stay in their sprint");
  }
  assertDates(bounds.startsOn, bounds.endsOn);
  const placed = range ? { ...item, ...checkedRange(range.startsOn, range.endsOn) } : item;
  const ordered = [...layout.items].sort((left, right) => left.rank - right.rank);
  const from = ordered.findIndex((candidate) => candidate.id === itemId);
  const unchanged =
    from === targetIndex && placed.startsOn === item.startsOn && placed.endsOn === item.endsOn;
  if (unchanged) {
    return roadmap;
  }
  const next = [...ordered];
  const [moving] = next.splice(from, 1);
  if (!moving) {
    return roadmap;
  }
  const index = from === targetIndex ? from : Math.min(Math.max(targetIndex, 0), next.length);
  next.splice(index, 0, placed);
  return commit({
    windows: roadmap.windows,
    sprintLayouts: roadmap.sprintLayouts.map((candidate) =>
      candidate.sprintId === layout.sprintId ? { ...candidate, items: renumber(next) } : candidate,
    ),
  });
}

export function hideSprintItem(roadmap: Roadmap, itemId: string): Roadmap {
  const { layout, item } = findSprintItem(roadmap, itemId);
  const hiddenWorkItemIds = layout.hiddenWorkItemIds.includes(item.workItemId)
    ? layout.hiddenWorkItemIds
    : [...layout.hiddenWorkItemIds, item.workItemId];
  const items = renumber(
    layout.items.filter((candidate) => candidate.id !== itemId).sort((left, right) => left.rank - right.rank),
  );
  return commit({
    windows: roadmap.windows,
    sprintLayouts: roadmap.sprintLayouts.map((candidate) =>
      candidate.sprintId === layout.sprintId
        ? { ...candidate, hiddenWorkItemIds, items }
        : candidate,
    ),
  });
}
