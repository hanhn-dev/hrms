import {
  LOG_DEFAULT_WINDOW_MS,
  LOG_MAX_WINDOW_MS,
  serverLocalBound,
} from "@hrms/db/logs";

export const LOG_TABS = ["activity", "pages", "exceptions", "login", "mydetails"] as const;

export type LogsTab = (typeof LOG_TABS)[number];

export type LogsQuery = {
  tab: LogsTab;
  employee: string | null;
  text: string | null;
  from: string | null;
  to: string | null;
  sessionId: string | null;
  page: number;
};

export type LogsSearchParams = {
  tab?: string;
  employee?: string;
  text?: string;
  from?: string;
  to?: string;
  session?: string;
  page?: string;
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
  if (value === "pages" || value === "exceptions" || value === "login" || value === "mydetails") {
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
  };
}

export function resolveLogWindow(
  query: LogsQuery,
  offsetMinutes = 0,
  now = new Date(),
): ResolvedLogWindow {
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
    if (to.getTime() - from.getTime() > LOG_MAX_WINDOW_MS) {
      to = new Date(from.getTime() + LOG_MAX_WINDOW_MS);
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
  const qs = search.toString();
  return `/employers/${employerId}/logs${qs ? `?${qs}` : ""}`;
}
