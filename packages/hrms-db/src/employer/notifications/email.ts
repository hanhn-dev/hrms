import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import { isMissingObjectError } from "../uploads/classify";
import {
  EMAIL_MODULE_LABELS,
  EMAIL_MODULES,
  EMAIL_PAGE_SIZE,
  EMAIL_STATUSES,
  normalizeEmailStatus,
  parseEmailModuleKey,
  type EmailModuleKey,
  type EmailStatus,
} from "./status";

export type EmailNotificationFilters = {
  module?: EmailModuleKey | null;
  status?: EmailStatus | null;
  template?: string | null;
  transId?: number | null;
  createdFrom?: Date | null;
  createdTo?: Date | null;
  page?: number;
};

export type EmailNotificationRow = {
  module: EmailModuleKey | string;
  moduleLabel: string;
  notificationId: number;
  templateName: string;
  transId: number;
  status: EmailStatus;
  rawStatus: string;
  createdDate: string | null;
  attemptsMade: number | null;
  isFetched: boolean;
  actionName: string | null;
  errorDetails: string | null;
  actionByName: string | null;
  requestOwnerName: string | null;
};

export type EmailStatusCount = {
  status: EmailStatus;
  count: number;
};

export type EmailNotificationList = {
  rows: EmailNotificationRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  counts: EmailStatusCount[];
  satellitesUnavailable: boolean;
};

type EmailSourceRow = {
  ModuleKey: string;
  NotificationId: number;
  TemplateName: string;
  TransId: number;
  NormalizedStatus: string;
  RawStatus: string | null;
  CreatedDate: Date | string | null;
  AttemptsMade: number | null;
  IsFetched: boolean | number | null;
  ActionName: string | null;
  ErrorDetails: string | null;
  ActionByName: string | null;
  RequestOwnerName: string | null;
};

type StatusCountRow = {
  NormalizedStatus: string;
  Total: number | bigint;
};

const SATELLITE_TABLES: Record<Exclude<EmailModuleKey, "core">, string> = {
  training: "[dbo].[TEMAIL_NOTIFICATION_TRAINING]",
  survey: "[dbo].[TEMAIL_NOTIFICATION_SURVEY]",
  "resource-allocation": "[dbo].[TEMAIL_NOTIFICATION_RESOURCEALLOCATION]",
  travel: "[dbo].[TEMAIL_NOTIFICATION_TRAVELNEXPENSE]",
};

const SATELLITE_STATUS_COLUMN: Record<Exclude<EmailModuleKey, "core">, string> = {
  training: "Notification.[Status]",
  survey: "Notification.[Status]",
  "resource-allocation": "Notification.IsCompleted",
  travel: "Notification.IsCompleted",
};

function clampPage(page: number | undefined): number {
  if (page == null || !Number.isInteger(page) || page < 1) {
    return 1;
  }
  return Math.min(page, 10_000);
}

function statusCase(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`CASE
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'N', N'NEW') THEN N'New'
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'P', N'PENDING') THEN N'Pending'
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'F', N'FAILED') THEN N'Failed'
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'C', N'COMPLETED') THEN N'Completed'
        ELSE N'Other'
    END`;
}

function dateFilter(
  column: Prisma.Sql,
  from: Date | null | undefined,
  to: Date | null | undefined,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  if (from && !Number.isNaN(from.getTime())) {
    parts.push(Prisma.sql`${column} >= ${from}`);
  }
  if (to && !Number.isNaN(to.getTime())) {
    parts.push(Prisma.sql`${column} <= ${to}`);
  }
  if (parts.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`AND ${Prisma.join(parts, " AND ")}`;
}

function likeFilter(
  column: Prisma.Sql,
  value: string | null | undefined,
): Prisma.Sql {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return Prisma.empty;
  }
  return Prisma.sql`AND ${column} LIKE ${`%${trimmed}%`}`;
}

function transFilter(
  column: Prisma.Sql,
  transId: number | null | undefined,
): Prisma.Sql {
  if (transId == null || !Number.isInteger(transId) || transId <= 0) {
    return Prisma.empty;
  }
  return Prisma.sql`AND ${column} = ${transId}`;
}

function personName(alias: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`NULLIF(LTRIM(RTRIM(CONCAT_WS(' ', ${alias}.FName, ${alias}.MiddleName, ${alias}.LName))), '')`;
}

function coreBranch(
  employerId: number,
  filters: EmailNotificationFilters,
): Prisma.Sql {
  const created = Prisma.sql`Notification.CreatedDate`;
  const template = Prisma.sql`Notification.TemplateName`;
  const transId = Prisma.sql`Notification.TransId`;
  const status = Prisma.sql`Notification.[Status]`;
  const actionBy = Prisma.sql`ActionBy`;
  const owner = Prisma.sql`Owner`;
  return Prisma.sql`
    SELECT
        N'core' AS ModuleKey,
        Notification.NotificationId,
        Notification.TemplateName,
        Notification.TransId,
        ${statusCase(status)} AS NormalizedStatus,
        LTRIM(RTRIM(CAST(${status} AS varchar(100)))) AS RawStatus,
        Notification.CreatedDate,
        CAST(NULL AS int) AS AttemptsMade,
        Notification.IsFetched,
        Notification.ActionName,
        Notification.ErrorDetails,
        ${personName(actionBy)} AS ActionByName,
        ${personName(owner)} AS RequestOwnerName
    FROM dbo.TEmailNotification AS Notification
    LEFT JOIN dbo.TEmployee AS ActionBy
        ON ActionBy.EmployeeId = Notification.ActionByEmployeeID
    LEFT JOIN dbo.TEmployee AS Owner
        ON Owner.EmployeeId = Notification.RequestOwnerEmployeeID
    WHERE Notification.Employerid = ${employerId}
        ${dateFilter(created, filters.createdFrom, filters.createdTo)}
        ${likeFilter(template, filters.template)}
        ${transFilter(transId, filters.transId)}
  `;
}

function satelliteBranch(
  module: Exclude<EmailModuleKey, "core">,
  employerId: number,
  filters: EmailNotificationFilters,
): Prisma.Sql {
  const table = Prisma.raw(SATELLITE_TABLES[module]);
  const status = Prisma.raw(SATELLITE_STATUS_COLUMN[module]);
  const created = Prisma.sql`Notification.CreatedOn`;
  const template = Prisma.sql`Notification.ModulePageName`;
  const transId = Prisma.sql`Notification.RequestId`;
  const actionBy = Prisma.sql`ActionBy`;
  return Prisma.sql`
    SELECT
        ${module} AS ModuleKey,
        Notification.ID AS NotificationId,
        Notification.ModulePageName AS TemplateName,
        Notification.RequestId AS TransId,
        ${statusCase(status)} AS NormalizedStatus,
        LTRIM(RTRIM(CAST(${status} AS varchar(100)))) AS RawStatus,
        Notification.CreatedOn AS CreatedDate,
        Notification.AttemptsMade,
        Notification.IsFetched,
        Notification.Content AS ActionName,
        CAST(NULL AS varchar(1000)) AS ErrorDetails,
        ${personName(actionBy)} AS ActionByName,
        CAST(NULL AS nvarchar(300)) AS RequestOwnerName
    FROM ${table} AS Notification
    LEFT JOIN dbo.TEmployee AS ActionBy
        ON ActionBy.EmployeeId = Notification.RequestRaisedFor
    WHERE Notification.EmployerId = ${employerId}
        ${dateFilter(created, filters.createdFrom, filters.createdTo)}
        ${likeFilter(template, filters.template)}
        ${transFilter(transId, filters.transId)}
  `;
}

function branchesFor(
  employerId: number,
  filters: EmailNotificationFilters,
): Array<{ module: EmailModuleKey; sql: Prisma.Sql }> {
  const selected = filters.module ?? null;
  const modules = selected ? [selected] : [...EMAIL_MODULES];
  return modules.map((module) => ({
    module,
    sql:
      module === "core"
        ? coreBranch(employerId, filters)
        : satelliteBranch(module, employerId, filters),
  }));
}

function unionOf(branches: Prisma.Sql[]): Prisma.Sql {
  return Prisma.join(branches, " UNION ALL ");
}

function statusWhere(status: EmailStatus | null | undefined): Prisma.Sql {
  if (!status) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE NormalizedStatus = ${status}`;
}

async function selectCounts(
  db: HrmsDb,
  branches: Prisma.Sql[],
): Promise<StatusCountRow[]> {
  const union = unionOf(branches);
  return db.$queryRaw<StatusCountRow[]>`
    WITH Sources AS (
        ${union}
    )
    SELECT NormalizedStatus, COUNT(*) AS Total
    FROM Sources
    GROUP BY NormalizedStatus
  `;
}

async function selectPage(
  db: HrmsDb,
  branches: Prisma.Sql[],
  status: EmailStatus | null | undefined,
  offset: number,
  limit: number,
): Promise<EmailSourceRow[]> {
  const union = unionOf(branches);
  const offsetSql = Prisma.raw(String(offset));
  const limitSql = Prisma.raw(String(limit));
  return db.$queryRaw<EmailSourceRow[]>`
    WITH Sources AS (
        ${union}
    )
    SELECT
        ModuleKey,
        NotificationId,
        TemplateName,
        TransId,
        NormalizedStatus,
        RawStatus,
        CreatedDate,
        AttemptsMade,
        IsFetched,
        ActionName,
        ErrorDetails,
        ActionByName,
        RequestOwnerName
    FROM Sources
    ${statusWhere(status)}
    ORDER BY CreatedDate DESC, NotificationId DESC
    OFFSET ${offsetSql} ROWS FETCH NEXT ${limitSql} ROWS ONLY
  `;
}

function foldCounts(rows: StatusCountRow[]): EmailStatusCount[] {
  const totals: Record<EmailStatus, number> = {
    New: 0,
    Pending: 0,
    Failed: 0,
    Completed: 0,
    Other: 0,
  };
  for (const row of rows) {
    const status = normalizeEmailStatus(row.NormalizedStatus);
    totals[status] += Number(row.Total);
  }
  return EMAIL_STATUSES.map((status) => ({ status, count: totals[status] }));
}

function createdMillis(value: Date | string | null): number {
  if (value == null) {
    return 0;
  }
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapRow(row: EmailSourceRow): EmailNotificationRow {
  const module = parseEmailModuleKey(row.ModuleKey);
  const rawStatus = row.RawStatus?.trim() || row.NormalizedStatus;
  return {
    module: module ?? row.ModuleKey,
    moduleLabel: module ? EMAIL_MODULE_LABELS[module] : row.ModuleKey,
    notificationId: row.NotificationId,
    templateName: row.TemplateName,
    transId: row.TransId,
    status: normalizeEmailStatus(row.NormalizedStatus),
    rawStatus,
    createdDate: asIso(row.CreatedDate),
    attemptsMade: row.AttemptsMade == null ? null : Number(row.AttemptsMade),
    isFetched: row.IsFetched === true || row.IsFetched === 1,
    actionName: row.ActionName,
    errorDetails: row.ErrorDetails,
    actionByName: row.ActionByName?.trim() || null,
    requestOwnerName: row.RequestOwnerName?.trim() || null,
  };
}

function emptyList(page: number, satellitesUnavailable: boolean): EmailNotificationList {
  return {
    rows: [],
    totalCount: 0,
    page,
    pageSize: EMAIL_PAGE_SIZE,
    counts: foldCounts([]),
    satellitesUnavailable,
  };
}

export async function listEmailNotifications(
  db: HrmsDb,
  employerId: number,
  filters: EmailNotificationFilters = {},
): Promise<EmailNotificationList> {
  const tenantId = parseEmployerId(employerId);
  const page = clampPage(filters.page);
  const offset = (page - 1) * EMAIL_PAGE_SIZE;
  const branches = branchesFor(tenantId, filters);
  if (branches.length === 0) {
    return emptyList(page, false);
  }

  try {
    const [countRows, pageRows] = await Promise.all([
      selectCounts(
        db,
        branches.map((branch) => branch.sql),
      ),
      selectPage(
        db,
        branches.map((branch) => branch.sql),
        filters.status,
        offset,
        EMAIL_PAGE_SIZE,
      ),
    ]);
    const counts = foldCounts(countRows);
    const totalCount = filters.status
      ? (counts.find((item) => item.status === filters.status)?.count ?? 0)
      : counts.reduce((sum, item) => sum + item.count, 0);
    return {
      rows: pageRows.map(mapRow),
      totalCount,
      page,
      pageSize: EMAIL_PAGE_SIZE,
      counts,
      satellitesUnavailable: false,
    };
  } catch (error) {
    if (!isMissingObjectError(error)) {
      throw error;
    }
    return listEmailNotificationsBySource(db, branches, filters, page, offset);
  }
}

async function listEmailNotificationsBySource(
  db: HrmsDb,
  branches: Array<{ module: EmailModuleKey; sql: Prisma.Sql }>,
  filters: EmailNotificationFilters,
  page: number,
  offset: number,
): Promise<EmailNotificationList> {
  const window = offset + EMAIL_PAGE_SIZE;
  const countRows: StatusCountRow[] = [];
  const pageRows: EmailSourceRow[] = [];
  let satellitesUnavailable = false;

  for (const branch of branches) {
    try {
      const [counts, rows] = await Promise.all([
        selectCounts(db, [branch.sql]),
        selectPage(db, [branch.sql], filters.status, 0, window),
      ]);
      countRows.push(...counts);
      pageRows.push(...rows);
    } catch (error) {
      if (branch.module === "core" || !isMissingObjectError(error)) {
        throw error;
      }
      satellitesUnavailable = true;
    }
  }

  pageRows.sort((left, right) => {
    const byDate = createdMillis(right.CreatedDate) - createdMillis(left.CreatedDate);
    if (byDate !== 0) {
      return byDate;
    }
    return right.NotificationId - left.NotificationId;
  });

  const counts = foldCounts(countRows);
  const totalCount = filters.status
    ? (counts.find((item) => item.status === filters.status)?.count ?? 0)
    : counts.reduce((sum, item) => sum + item.count, 0);

  return {
    rows: pageRows.slice(offset, offset + EMAIL_PAGE_SIZE).map(mapRow),
    totalCount,
    page,
    pageSize: EMAIL_PAGE_SIZE,
    counts,
    satellitesUnavailable,
  };
}
