import {
  parseEmailModuleKey,
  type EmailModuleKey,
  type EmailStatus,
} from "@hrms/db/notifications";
import { LIST_PAGE_SIZE } from "@hrms/db/page";
import { notificationsHref } from "@/features/employer/notifications/notifications-source";

export type EmailTriggersQuery = {
  module: EmailModuleKey | null;
  from: string | null;
  to: string | null;
  rangeAll: boolean;
};

export type EmailTriggersSearchParams = {
  module?: string;
  from?: string;
  to?: string;
  range?: string;
};

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

export function parseEmailTriggersQuery(
  input: EmailTriggersSearchParams,
): EmailTriggersQuery {
  return {
    module: parseEmailModuleKey(input.module),
    from: parseInstant(input.from),
    to: parseInstant(input.to),
    rangeAll: input.range === "all",
  };
}

export function resolveEmailTriggersWindow(
  query: EmailTriggersQuery,
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

export function emailTriggersHref(
  employerId: number,
  query: EmailTriggersQuery,
): string {
  const search = new URLSearchParams();
  if (query.module) {
    search.set("module", query.module);
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
  const qs = search.toString();
  return `/employers/${employerId}/email-triggers${qs ? `?${qs}` : ""}`;
}

export function notificationsDrilldownHref(
  employerId: number,
  query: EmailTriggersQuery,
  patch: {
    status?: EmailStatus | null;
    module?: EmailModuleKey | null;
    from?: string | null;
    to?: string | null;
  } = {},
): string {
  const from =
    patch.from !== undefined
      ? patch.from
      : query.rangeAll
        ? null
        : query.from;
  const to =
    patch.to !== undefined ? patch.to : query.rangeAll ? null : query.to;
  return notificationsHref(employerId, {
    tab: "email",
    module: patch.module === undefined ? query.module : patch.module,
    status: patch.status ?? null,
    template: null,
    transId: null,
    from,
    to,
    rangeAll: query.rangeAll,
    page: 1,
    pageSize: LIST_PAGE_SIZE,
    side: "for",
    category: null,
    requestType: null,
    employee: null,
  });
}
