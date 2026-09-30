import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import { INBOX_PAGE_SIZE, type InboxSide } from "./status";
import { parseWaitingOn, type InboxPerson } from "./waiting-on";

const UNCATEGORIZED = "Other";

export type { InboxSide } from "./status";

export type PendingInboxFilters = {
  side: InboxSide;
  category?: string | null;
  requestType?: string | null;
  employee?: string | null;
  page?: number | null;
};

export type { InboxPerson } from "./waiting-on";

export type PendingInboxTypeCount = {
  requestType: string;
  count: number;
};

export type PendingInboxCategory = {
  name: string;
  total: number;
  types: PendingInboxTypeCount[];
};

export type PendingInboxRow = {
  requestId: number;
  requestType: string;
  category: string;
  approvalLevel: string | null;
  subjectName: string | null;
  subjectEmploymentNumber: string | null;
  waitingOn: InboxPerson[];
  createdDate: string | null;
  reassignReason: string | null;
};

export type PendingInboxList = {
  side: InboxSide;
  activeCategory: string | null;
  categories: PendingInboxCategory[];
  rows: PendingInboxRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

type TypeCountRow = {
  RequestType: string | null;
  CategoryName: string | null;
  Total: number | bigint | null;
};

type InboxRow = {
  RequestId: number | bigint | null;
  RequestType: string | null;
  CategoryName: string | null;
  SubjectName: string | null;
  SubjectEmploymentNumber: string | null;
  CreatedDate: Date | null;
  WaitingOn: string | null;
  ApprovalLevels: string | null;
  ReassignReason: string | null;
};

function pageOf(value: number | null | undefined): number {
  if (value == null || !Number.isInteger(value) || value < 1) {
    return 1;
  }
  return Math.min(value, 10000);
}

function textFilter(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function countOf(value: number | bigint | null | undefined): number {
  return Number(value ?? 0);
}

function personName(alias: string): Prisma.Sql {
  return Prisma.sql`NULLIF(LTRIM(RTRIM(CONCAT_WS(' ', ${Prisma.raw(alias)}.FName, ${Prisma.raw(alias)}.MiddleName, ${Prisma.raw(alias)}.LName))), '')`;
}

function scopeJoins(side: InboxSide, employerId: number): Prisma.Sql {
  if (side === "by") {
    return Prisma.sql`
      INNER JOIN dbo.TEmployee AS Subject
        ON Subject.EmployeeId = Queue.RequestForEmployee
       AND Subject.Employerid = ${employerId}
      LEFT JOIN dbo.TEmployeeInfo AS SubjectInfo
        ON SubjectInfo.EmployeeId = Subject.EmployeeId
      LEFT JOIN dbo.TEmployee AS Manager
        ON Manager.EmployeeId = Queue.ManagerId
      LEFT JOIN dbo.TEmployeeInfo AS ManagerInfo
        ON ManagerInfo.EmployeeId = Manager.EmployeeId
    `;
  }
  return Prisma.sql`
    INNER JOIN dbo.TEmployee AS Manager
      ON Manager.EmployeeId = Queue.ManagerId
     AND Manager.Employerid = ${employerId}
    LEFT JOIN dbo.TEmployeeInfo AS ManagerInfo
      ON ManagerInfo.EmployeeId = Manager.EmployeeId
    LEFT JOIN dbo.TEmployee AS Subject
      ON Subject.EmployeeId = Queue.RequestForEmployee
    LEFT JOIN dbo.TEmployeeInfo AS SubjectInfo
      ON SubjectInfo.EmployeeId = Subject.EmployeeId
  `;
}

function categoryMap(employerId: number): Prisma.Sql {
  return Prisma.sql`
    LEFT JOIN (
      SELECT Ranked.RequestType, Ranked.ModuleName
      FROM (
        SELECT
          Home.RequestType,
          Module.ModuleName,
          ROW_NUMBER() OVER (
            PARTITION BY Home.RequestType
            ORDER BY
              CASE
                WHEN Home.EmployerId = ${employerId} THEN 0
                WHEN Home.EmployerId = 0 OR Home.EmployerId IS NULL THEN 1
                ELSE 2
              END,
              Home.NotificationId
          ) AS RowNumber
        FROM dbo.THomePageNotifications AS Home
        INNER JOIN dbo.THrmsModules AS Module
          ON Module.ModuleId = Home.NotificationGroupId
        WHERE Home.RequestType IS NOT NULL
          AND LTRIM(RTRIM(Home.RequestType)) <> ''
      ) AS Ranked
      WHERE Ranked.RowNumber = 1
    ) AS CategoryMap
      ON CategoryMap.RequestType = Queue.RequestType
  `;
}

function employeeFilter(employee: string | null): Prisma.Sql {
  if (!employee) {
    return Prisma.empty;
  }
  const pattern = `%${employee}%`;
  return Prisma.sql`
    AND (
      SubjectInfo.EmploymentNumber LIKE ${pattern}
      OR ManagerInfo.EmploymentNumber LIKE ${pattern}
      OR CONCAT_WS(' ', Subject.FName, Subject.MiddleName, Subject.LName) LIKE ${pattern}
      OR CONCAT_WS(' ', Manager.FName, Manager.MiddleName, Manager.LName) LIKE ${pattern}
    )
  `;
}

function pendingCte(
  side: InboxSide,
  employerId: number,
  employee: string | null,
): Prisma.Sql {
  return Prisma.sql`
    Pending AS (
      SELECT
        Queue.RequestTransid AS RequestId,
        ISNULL(NULLIF(LTRIM(RTRIM(Queue.RequestType)), ''), N'Unknown') AS RequestType,
        Queue.ApprovalLevel,
        ISNULL(CategoryMap.ModuleName, ${UNCATEGORIZED}) AS CategoryName,
        ${personName("Subject")} AS SubjectName,
        NULLIF(LTRIM(RTRIM(SubjectInfo.EmploymentNumber)), '') AS SubjectEmploymentNumber,
        ${personName("Manager")} AS ManagerName,
        NULLIF(LTRIM(RTRIM(ManagerInfo.EmploymentNumber)), '') AS ManagerEmploymentNumber,
        Queue.CreatedDate,
        NULLIF(LTRIM(RTRIM(Queue.ReassignReason)), '') AS ReassignReason
      FROM dbo.TRequestWorkflows AS Queue
      ${scopeJoins(side, employerId)}
      ${categoryMap(employerId)}
      WHERE Queue.ApproveStatus = 'P'
        AND ISNULL(Queue.IsDeleted, 0) = 0
        ${employeeFilter(employee)}
    )
  `;
}

function foldCategories(rows: TypeCountRow[]): PendingInboxCategory[] {
  const byName = new Map<string, PendingInboxCategory>();
  for (const row of rows) {
    const name = row.CategoryName?.trim() || UNCATEGORIZED;
    const requestType = row.RequestType?.trim() || "Unknown";
    const count = countOf(row.Total);
    const category = byName.get(name) ?? { name, total: 0, types: [] };
    category.total += count;
    category.types.push({ requestType, count });
    byName.set(name, category);
  }
  return [...byName.values()].sort(
    (left, right) => right.total - left.total || left.name.localeCompare(right.name),
  );
}

function toRow(row: InboxRow): PendingInboxRow {
  const levels = row.ApprovalLevels?.split(",")
    .map((level) => level.trim())
    .filter(Boolean);
  return {
    requestId: Number(row.RequestId ?? 0),
    requestType: row.RequestType?.trim() || "Unknown",
    category: row.CategoryName?.trim() || UNCATEGORIZED,
    approvalLevel: levels && levels.length > 0 ? levels.join(", ") : null,
    subjectName: row.SubjectName,
    subjectEmploymentNumber: row.SubjectEmploymentNumber,
    waitingOn: parseWaitingOn(row.WaitingOn),
    createdDate: asIso(row.CreatedDate),
    reassignReason: row.ReassignReason,
  };
}

export async function listPendingInbox(
  db: HrmsDb,
  employerIdInput: number,
  filters: PendingInboxFilters,
): Promise<PendingInboxList> {
  const employerId = parseEmployerId(employerIdInput);
  const page = pageOf(filters.page);
  const offset = (page - 1) * INBOX_PAGE_SIZE;
  const employee = textFilter(filters.employee, 100);
  const requestedCategory = textFilter(filters.category, 100);
  const requestType = textFilter(filters.requestType, 50);
  const typeFilter = requestType
    ? Prisma.sql`AND RequestType = ${requestType}`
    : Prisma.empty;

  const countRows = await db.$queryRaw<TypeCountRow[]>`
    WITH ${pendingCte(filters.side, employerId, employee)}
    SELECT
      RequestType,
      CategoryName,
      COUNT(DISTINCT RequestId) AS Total
    FROM Pending
    GROUP BY RequestType, CategoryName
    ORDER BY COUNT(DISTINCT RequestId) DESC, CategoryName, RequestType
  `;
  const categories = foldCategories(countRows);
  const categoryOfType = requestType
    ? categories.find((category) =>
        category.types.some((type) => type.requestType === requestType),
      )?.name ?? null
    : null;
  const activeCategory =
    requestedCategory ?? categoryOfType ?? categories[0]?.name ?? null;
  const categoryFilter =
    requestType || !activeCategory
      ? Prisma.empty
      : Prisma.sql`AND CategoryName = ${activeCategory}`;

  const rows = await db.$queryRaw<InboxRow[]>`
    WITH ${pendingCte(filters.side, employerId, employee)},
    Grouped AS (
      SELECT
        RequestType,
        RequestId,
        MAX(CategoryName) AS CategoryName,
        MAX(SubjectName) AS SubjectName,
        MAX(SubjectEmploymentNumber) AS SubjectEmploymentNumber,
        MIN(CreatedDate) AS CreatedDate
      FROM Pending
      WHERE 1 = 1
        ${categoryFilter}
        ${typeFilter}
      GROUP BY RequestType, RequestId
    )
    SELECT
      Grouped.RequestId,
      Grouped.RequestType,
      Grouped.CategoryName,
      Grouped.SubjectName,
      Grouped.SubjectEmploymentNumber,
      Grouped.CreatedDate,
      Waiting.WaitingOn,
      Levels.ApprovalLevels,
      Reasons.ReassignReason
    FROM Grouped
    OUTER APPLY (
      SELECT STRING_AGG(CAST(People.Label AS nvarchar(max)), NCHAR(30)) WITHIN GROUP (ORDER BY People.Label) AS WaitingOn
      FROM (
        SELECT DISTINCT
          CONCAT(
            ISNULL(Pending.ManagerName, N''),
            NCHAR(31),
            ISNULL(Pending.ManagerEmploymentNumber, N'')
          ) AS Label
        FROM Pending
        WHERE Pending.RequestType = Grouped.RequestType
          AND Pending.RequestId = Grouped.RequestId
          AND (Pending.ManagerName IS NOT NULL OR Pending.ManagerEmploymentNumber IS NOT NULL)
      ) AS People
    ) AS Waiting
    OUTER APPLY (
      SELECT STRING_AGG(CAST(LevelList.LevelText AS nvarchar(max)), N',') WITHIN GROUP (ORDER BY LevelList.LevelText) AS ApprovalLevels
      FROM (
        SELECT DISTINCT CAST(Pending.ApprovalLevel AS nvarchar(10)) AS LevelText
        FROM Pending
        WHERE Pending.RequestType = Grouped.RequestType
          AND Pending.RequestId = Grouped.RequestId
          AND Pending.ApprovalLevel IS NOT NULL
      ) AS LevelList
    ) AS Levels
    OUTER APPLY (
      SELECT STRING_AGG(CAST(ReasonList.ReassignReason AS nvarchar(max)), N' | ') WITHIN GROUP (ORDER BY ReasonList.ReassignReason) AS ReassignReason
      FROM (
        SELECT DISTINCT Pending.ReassignReason
        FROM Pending
        WHERE Pending.RequestType = Grouped.RequestType
          AND Pending.RequestId = Grouped.RequestId
          AND Pending.ReassignReason IS NOT NULL
      ) AS ReasonList
    ) AS Reasons
    ORDER BY Grouped.CreatedDate DESC, Grouped.RequestId DESC
    OFFSET ${Prisma.raw(String(offset))} ROWS
    FETCH NEXT ${Prisma.raw(String(INBOX_PAGE_SIZE))} ROWS ONLY
  `;

  const active = categories.find((category) => category.name === activeCategory);
  const typeCount = requestType
    ? active?.types.find((type) => type.requestType === requestType)?.count ??
      categories
        .flatMap((category) => category.types)
        .find((type) => type.requestType === requestType)?.count ??
      0
    : (active?.total ?? 0);

  return {
    side: filters.side,
    activeCategory,
    categories,
    rows: rows.map(toRow),
    totalCount: typeCount,
    page,
    pageSize: INBOX_PAGE_SIZE,
  };
}
