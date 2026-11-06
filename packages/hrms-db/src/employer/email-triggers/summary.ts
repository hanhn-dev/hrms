import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import { isMissingObjectError } from "../uploads/classify";
import {
  EMAIL_MODULE_LABELS,
  EMAIL_MODULES,
  EMAIL_STATUSES,
  normalizeEmailStatus,
  parseEmailModuleKey,
  type EmailModuleKey,
  type EmailStatus,
} from "../notifications/status";
import {
  DELIVERY_STATUSES,
  parseDeliveryStatus,
  type DeliveryStatus,
} from "./status";

export type EmailTriggerSummaryFilters = {
  module?: EmailModuleKey | null;
  createdFrom?: Date | null;
  createdTo?: Date | null;
};

export type EmailTriggerStatusCount = {
  status: EmailStatus;
  count: number;
};

export type EmailTriggerModuleCount = {
  module: EmailModuleKey;
  label: string;
  count: number;
};

export type EmailDeliveryStatusCount = {
  status: DeliveryStatus;
  count: number;
};

export type EmailTriggerSummary = {
  triggerByStatus: EmailTriggerStatusCount[];
  triggerByModule: EmailTriggerModuleCount[];
  deliveryByStatus: EmailDeliveryStatusCount[];
  total: number;
  satellitesUnavailable: boolean;
  appliedFrom: string | null;
  appliedTo: string | null;
};

type AggregateRow = {
  ModuleKey: string;
  NormalizedStatus: string;
  DeliveryStatus: string;
  Total: number | bigint;
};

const SATELLITE_TABLES: Record<Exclude<EmailModuleKey, "core">, string> = {
  training: "[dbo].[TEMAIL_NOTIFICATION_TRAINING]",
  survey: "[dbo].[TEMAIL_NOTIFICATION_SURVEY]",
  "resource-allocation": "[dbo].[TEMAIL_NOTIFICATION_RESOURCEALLOCATION]",
  travel: "[dbo].[TEMAIL_NOTIFICATION_TRAVELNEXPENSE]",
};

const SATELLITE_STATUS_COLUMN: Record<Exclude<EmailModuleKey, "core">, string> =
  {
    training: "Notification.[Status]",
    survey: "Notification.[Status]",
    "resource-allocation": "Notification.IsCompleted",
    travel: "Notification.IsCompleted",
  };

function statusCase(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`CASE
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'N', N'NEW') THEN N'New'
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'P', N'PENDING', N'PENDING_OLD', N'PENDING2') THEN N'Pending'
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'F', N'FAILED') THEN N'Failed'
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'C', N'COMPLETED') THEN N'Completed'
        WHEN UPPER(LTRIM(RTRIM(CAST(${column} AS varchar(100))))) IN (N'REVIEW', N'UNDER REVIEW') THEN N'Under Review'
        ELSE N'Other'
    END`;
}

function deliveryCase(): Prisma.Sql {
  return Prisma.sql`CASE
        WHEN Email.EmailSent = 1 THEN N'Sent'
        WHEN Email.ID IS NULL THEN N'Not Queued'
        WHEN Email.SentAttempts IN (7, 9) THEN N'Poisoned'
        ELSE N'Queued'
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

function coreBranch(
  employerId: number,
  filters: EmailTriggerSummaryFilters,
): Prisma.Sql {
  const created = Prisma.sql`Notification.CreatedDate`;
  const status = Prisma.sql`Notification.[Status]`;
  return Prisma.sql`
    SELECT
        N'core' AS ModuleKey,
        ${statusCase(status)} AS NormalizedStatus,
        ${deliveryCase()} AS DeliveryStatus
    FROM dbo.TEmailNotification AS Notification
    LEFT JOIN dbo.TEmail AS Email
        ON Email.EmailNotificationId = Notification.NotificationId
    WHERE Notification.Employerid = ${employerId}
        ${dateFilter(created, filters.createdFrom, filters.createdTo)}
  `;
}

function satelliteBranch(
  module: Exclude<EmailModuleKey, "core">,
  employerId: number,
  filters: EmailTriggerSummaryFilters,
): Prisma.Sql {
  const table = Prisma.raw(SATELLITE_TABLES[module]);
  const status = Prisma.raw(SATELLITE_STATUS_COLUMN[module]);
  const created = Prisma.sql`Notification.CreatedOn`;
  return Prisma.sql`
    SELECT
        ${module} AS ModuleKey,
        ${statusCase(status)} AS NormalizedStatus,
        ${deliveryCase()} AS DeliveryStatus
    FROM ${table} AS Notification
    LEFT JOIN dbo.TEmail AS Email
        ON Email.EmailNotificationId = Notification.ID
    WHERE Notification.EmployerId = ${employerId}
        ${dateFilter(created, filters.createdFrom, filters.createdTo)}
  `;
}

function branchesFor(
  employerId: number,
  filters: EmailTriggerSummaryFilters,
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

async function selectAggregates(
  db: HrmsDb,
  branches: Prisma.Sql[],
): Promise<AggregateRow[]> {
  const union = unionOf(branches);
  return db.$queryRaw<AggregateRow[]>`
    WITH Sources AS (
        ${union}
    )
    SELECT
        ModuleKey,
        NormalizedStatus,
        DeliveryStatus,
        COUNT(*) AS Total
    FROM Sources
    GROUP BY ModuleKey, NormalizedStatus, DeliveryStatus
  `;
}

function emptySummary(
  filters: EmailTriggerSummaryFilters,
  satellitesUnavailable: boolean,
): EmailTriggerSummary {
  return {
    triggerByStatus: EMAIL_STATUSES.map((status) => ({ status, count: 0 })),
    triggerByModule: EMAIL_MODULES.map((module) => ({
      module,
      label: EMAIL_MODULE_LABELS[module],
      count: 0,
    })),
    deliveryByStatus: DELIVERY_STATUSES.map((status) => ({
      status,
      count: 0,
    })),
    total: 0,
    satellitesUnavailable,
    appliedFrom: asIso(filters.createdFrom ?? null),
    appliedTo: asIso(filters.createdTo ?? null),
  };
}

function foldSummary(
  rows: AggregateRow[],
  filters: EmailTriggerSummaryFilters,
  satellitesUnavailable: boolean,
): EmailTriggerSummary {
  const triggerTotals: Record<EmailStatus, number> = {
    New: 0,
    Pending: 0,
    Failed: 0,
    Completed: 0,
    "Under Review": 0,
    Other: 0,
  };
  const moduleTotals: Record<EmailModuleKey, number> = {
    core: 0,
    training: 0,
    "resource-allocation": 0,
    survey: 0,
    travel: 0,
  };
  const deliveryTotals: Record<DeliveryStatus, number> = {
    Sent: 0,
    Queued: 0,
    "Not Queued": 0,
    Poisoned: 0,
  };

  let total = 0;
  for (const row of rows) {
    const count = Number(row.Total);
    total += count;
    const status = normalizeEmailStatus(row.NormalizedStatus);
    triggerTotals[status] += count;
    const module = parseEmailModuleKey(row.ModuleKey);
    if (module) {
      moduleTotals[module] += count;
    }
    const delivery = parseDeliveryStatus(row.DeliveryStatus) ?? "Not Queued";
    deliveryTotals[delivery] += count;
  }

  const selected = filters.module ?? null;
  const moduleKeys = selected ? [selected] : [...EMAIL_MODULES];

  return {
    triggerByStatus: EMAIL_STATUSES.map((status) => ({
      status,
      count: triggerTotals[status],
    })),
    triggerByModule: moduleKeys.map((module) => ({
      module,
      label: EMAIL_MODULE_LABELS[module],
      count: moduleTotals[module],
    })),
    deliveryByStatus: DELIVERY_STATUSES.map((status) => ({
      status,
      count: deliveryTotals[status],
    })),
    total,
    satellitesUnavailable,
    appliedFrom: asIso(filters.createdFrom ?? null),
    appliedTo: asIso(filters.createdTo ?? null),
  };
}

export async function getEmailTriggerSummary(
  db: HrmsDb,
  employerId: number,
  filters: EmailTriggerSummaryFilters = {},
): Promise<EmailTriggerSummary> {
  const tenantId = parseEmployerId(employerId);
  const branches = branchesFor(tenantId, filters);
  if (branches.length === 0) {
    return emptySummary(filters, false);
  }

  try {
    const rows = await selectAggregates(
      db,
      branches.map((branch) => branch.sql),
    );
    return foldSummary(rows, filters, false);
  } catch (error) {
    if (!isMissingObjectError(error)) {
      throw error;
    }
    return getEmailTriggerSummaryBySource(db, branches, filters);
  }
}

async function getEmailTriggerSummaryBySource(
  db: HrmsDb,
  branches: Array<{ module: EmailModuleKey; sql: Prisma.Sql }>,
  filters: EmailTriggerSummaryFilters,
): Promise<EmailTriggerSummary> {
  const rows: AggregateRow[] = [];
  let satellitesUnavailable = false;

  for (const branch of branches) {
    try {
      const branchRows = await selectAggregates(db, [branch.sql]);
      rows.push(...branchRows);
    } catch (error) {
      if (branch.module === "core" || !isMissingObjectError(error)) {
        throw error;
      }
      satellitesUnavailable = true;
    }
  }

  return foldSummary(rows, filters, satellitesUnavailable);
}
