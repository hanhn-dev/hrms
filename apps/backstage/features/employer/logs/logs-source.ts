import { readListPageSize } from "@/shared/list-query";
import { LIST_PAGE_SIZE } from "@hrms/db/page";
import {
  LOG_DEFAULT_WINDOW_MS,
  LOG_MAX_WINDOW_MS,
  LOG_SQL_ERROR_MAX_WINDOW_MS,
  serverLocalBound,
} from "@hrms/db/logs";

export const LOG_TABS = ["activity", "pages", "exceptions", "login", "mydetails", "sqlerrors"] as const;

export type LogsTab = (typeof LOG_TABS)[number];

export const LOG_RANGE_PRESETS = ["24h", "7d", "14d"] as const;

export type LogRangePreset = (typeof LOG_RANGE_PRESETS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESET_MATCH_TOLERANCE_MS = 60_000;

export const LOG_RANGE_PRESET_MS: Record<LogRangePreset, number> = {
  "24h": LOG_DEFAULT_WINDOW_MS,
  "7d": 7 * DAY_MS,
  "14d": 14 * DAY_MS,
};

export const LOG_RANGE_PRESET_OPTIONS: { label: string; value: LogRangePreset }[] = [
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
];

export type LogsQuery = {
  tab: LogsTab;
  employee: string | null;
  text: string | null;
  from: string | null;
  to: string | null;
  sessionId: string | null;
  page: number;
  pageSize: number;
};

export type LogsSearchParams = {
  tab?: string;
  employee?: string;
  text?: string;
  from?: string;
  to?: string;
  session?: string;
  page?: string;
  pageSize?: string;
};

export type ResolvedLogWindow = {
  from: Date;
  to: Date;
  serverFrom: Date;
  serverTo: Date;
  usingDefaultWindow: boolean;
  windowLimited: boolean;
};

function parseTab(value: string | undefined): LogsTab {
  if (
    value === "pages" ||
    value === "exceptions" ||
    value === "login" ||
    value === "mydetails" ||
    value === "sqlerrors"
  ) {
    return value;
  }
  return "activity";
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function parseText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < 2 || trimmed.length > 100) {
    return null;
  }
  return trimmed;
}

function parseInstant(value: string | undefined): string | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export function parseLogsQuery(input: LogsSearchParams): LogsQuery {
  return {
    tab: parseTab(input.tab),
    employee: parseText(input.employee),
    text: parseText(input.text),
    from: parseInstant(input.from),
    to: parseInstant(input.to),
    sessionId: parseText(input.session),
    page: parsePage(input.page),
    pageSize: readListPageSize(input.pageSize),
  };
}

export function resolveLogWindow(
  query: LogsQuery,
  offsetMinutes = 0,
  now = new Date(),
): ResolvedLogWindow {
  const maxMs = query.tab === "sqlerrors" ? LOG_SQL_ERROR_MAX_WINDOW_MS : LOG_MAX_WINDOW_MS;
  let from: Date;
  let to: Date;
  let usingDefaultWindow = false;
  let windowLimited = false;

  if (!query.from && !query.to) {
    to = now;
    from = new Date(now.getTime() - LOG_DEFAULT_WINDOW_MS);
    usingDefaultWindow = true;
  } else {
    from = query.from
      ? new Date(query.from)
      : new Date(now.getTime() - LOG_DEFAULT_WINDOW_MS);
    to = query.to ? new Date(query.to) : now;
    if (to.getTime() < from.getTime()) {
      to = from;
      windowLimited = true;
    }
    if (to.getTime() - from.getTime() > maxMs) {
      to = new Date(from.getTime() + maxMs);
      windowLimited = true;
    }
  }

  return {
    from,
    to,
    serverFrom: serverLocalBound(from, offsetMinutes),
    serverTo: serverLocalBound(to, offsetMinutes),
    usingDefaultWindow,
    windowLimited,
  };
}

export function matchLogRangePreset(
  from: Date,
  to: Date,
  usingDefaultWindow: boolean,
): LogRangePreset | undefined {
  if (usingDefaultWindow) {
    return "24h";
  }
  const spanMs = to.getTime() - from.getTime();
  for (const preset of ["7d", "14d", "24h"] as const) {
    if (Math.abs(spanMs - LOG_RANGE_PRESET_MS[preset]) <= PRESET_MATCH_TOLERANCE_MS) {
      return preset;
    }
  }
  return undefined;
}

export function logRangePresetLabel(preset: LogRangePreset): string {
  switch (preset) {
    case "24h":
      return "Showing the last 24 hours.";
    case "7d":
      return "Showing the last 7 days.";
    case "14d":
      return "Showing the last 14 days.";
  }
}

export function applyLogRangePreset(
  preset: LogRangePreset,
  now = new Date(),
): { from: string | null; to: string | null } {
  if (preset === "24h") {
    return { from: null, to: null };
  }
  return {
    from: new Date(now.getTime() - LOG_RANGE_PRESET_MS[preset]).toISOString(),
    to: now.toISOString(),
  };
}

export function logsHref(employerId: number, query: LogsQuery): string {
  const search = new URLSearchParams();
  if (query.tab !== "activity") {
    search.set("tab", query.tab);
  }
  if (query.employee) {
    search.set("employee", query.employee);
  }
  if (query.text) {
    search.set("text", query.text);
  }
  if (query.from) {
    search.set("from", query.from);
  }
  if (query.to) {
    search.set("to", query.to);
  }
  if (query.sessionId && query.tab === "pages") {
    search.set("session", query.sessionId);
  }
  if (query.page > 1) {
    search.set("page", String(query.page));
  }
  if (query.pageSize !== LIST_PAGE_SIZE) {
    search.set("pageSize", String(query.pageSize));
  }
  const qs = search.toString();
  return `/employers/${employerId}/logs${qs ? `?${qs}` : ""}`;
}
