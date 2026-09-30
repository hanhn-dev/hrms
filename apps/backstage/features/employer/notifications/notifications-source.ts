import {
  parseEmailModuleKey,
  parseEmailStatus,
  type EmailModuleKey,
  type EmailStatus,
  type InboxSide,
} from "@hrms/db/notifications";

export const NOTIFICATION_TABS = ["email", "inbox"] as const;

export type NotificationsTab = (typeof NOTIFICATION_TABS)[number];

export type NotificationsQuery = {
  tab: NotificationsTab;
  module: EmailModuleKey | null;
  status: EmailStatus | null;
  template: string | null;
  transId: number | null;
  from: string | null;
  to: string | null;
  rangeAll: boolean;
  page: number;
  side: InboxSide;
  category: string | null;
  requestType: string | null;
  employee: string | null;
};

export type NotificationsSearchParams = {
  tab?: string;
  module?: string;
  status?: string;
  template?: string;
  transId?: string;
  from?: string;
  to?: string;
  range?: string;
  page?: string;
  side?: string;
  category?: string;
  requestType?: string;
  employee?: string;
};

function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function parseTransId(value: string | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

function parseText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function parseNotificationsQuery(
  input: NotificationsSearchParams,
): NotificationsQuery {
  return {
    tab: input.tab === "inbox" ? "inbox" : "email",
    module: parseEmailModuleKey(input.module),
    status: parseEmailStatus(input.status),
    template: parseText(input.template),
    transId: parseTransId(input.transId),
    from: parseInstant(input.from),
    to: parseInstant(input.to),
    rangeAll: input.range === "all",
    page: parsePage(input.page),
    side: input.side === "by" ? "by" : "for",
    category: parseText(input.category),
    requestType: parseText(input.requestType),
    employee: parseText(input.employee),
  };
}

export function resolveEmailWindow(
  query: NotificationsQuery,
  now = new Date(),
): { from: Date | null; to: Date | null; usingDefaultWindow: boolean } {
  if (query.rangeAll) {
    return { from: null, to: null, usingDefaultWindow: false };
  }
  if (query.from || query.to) {
    return {
      from: query.from ? new Date(query.from) : null,
      to: query.to ? new Date(query.to) : null,
      usingDefaultWindow: false,
    };
  }
  return {
    from: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    to: now,
    usingDefaultWindow: true,
  };
}

export function notificationsHref(
  employerId: number,
  query: NotificationsQuery,
): string {
  const search = new URLSearchParams();
  if (query.tab === "inbox") {
    search.set("tab", "inbox");
  }
  if (query.module) {
    search.set("module", query.module);
  }
  if (query.status) {
    search.set("status", query.status);
  }
  if (query.template) {
    search.set("template", query.template);
  }
  if (query.transId) {
    search.set("transId", String(query.transId));
  }
  if (query.rangeAll) {
    search.set("range", "all");
  } else {
    if (query.from) {
      search.set("from", query.from);
    }
    if (query.to) {
      search.set("to", query.to);
    }
  }
  if (query.page > 1) {
    search.set("page", String(query.page));
  }
  if (query.side === "by") {
    search.set("side", "by");
  }
  if (query.category) {
    search.set("category", query.category);
  }
  if (query.requestType) {
    search.set("requestType", query.requestType);
  }
  if (query.employee) {
    search.set("employee", query.employee);
  }
  const qs = search.toString();
  return `/employers/${employerId}/notifications${qs ? `?${qs}` : ""}`;
}
