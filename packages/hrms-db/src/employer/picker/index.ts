import { Prisma } from "../../generated/prisma/client";
import { checkDatabase, type HrmsDb } from "../../shared/client";
import { asIso } from "../../shared/iso";
import {
  likeContains,
  LOOKUP_LIMIT,
  pageQuery,
  searchText,
  totalCountOf,
  type PageResult,
} from "../../shared/page.ts";

export type EmployerListItem = {
  employerId: number;
  employerName: string;
  isActive: string | boolean | number | null;
  licenseCount: number | null;
  employeeCount: number;
  failedAttempts: number | null;
  timeZone: string | null;
};

export type EmployerLookup = {
  employerId: number;
  employerName: string;
};

export type EmployerListPage = PageResult<EmployerListItem>;

type EmployerSqlRow = {
  EmployerId: number;
  EmployerName: string;
  IsActive: string | boolean | number | null;
  LicenseCount: string | number | null;
  EmployeeCount: number;
  FailedAttempts: number | null;
  TimeZone: string | null;
  TotalCount: number | bigint | null;
};

function employerNameFilter(q: string | null): Prisma.Sql {
  if (q == null) {
    return Prisma.empty;
  }
  const pattern = likeContains(q);
  return Prisma.sql`AND (
        Employer.EmployerName LIKE ${pattern}
        OR CONVERT(NVARCHAR(20), Employer.Employerid) LIKE ${pattern}
    )`;
}

/** Active employers first, then id. NULL and 0 stay with the inactive group. */
export function employerListOrder(): Prisma.Sql {
  return Prisma.sql`CASE WHEN Employer.IsActive = 1 THEN 0 ELSE 1 END, Employer.Employerid ASC`;
}

function mapEmployer(row: EmployerSqlRow): EmployerListItem {
  return {
    employerId: row.EmployerId,
    employerName: row.EmployerName,
    isActive: row.IsActive,
    licenseCount:
      row.LicenseCount == null || row.LicenseCount === ""
        ? null
        : Number(row.LicenseCount),
    employeeCount: Number(row.EmployeeCount),
    failedAttempts: row.FailedAttempts,
    timeZone: row.TimeZone,
  };
}

export async function listEmployers(
  db: HrmsDb,
  filters: { page?: number | null; pageSize?: number | null; q?: string | null } = {},
): Promise<EmployerListPage> {
  const paging = pageQuery(filters.page, filters.pageSize);
  const rows = await db.$queryRaw<EmployerSqlRow[]>`
    SELECT
        Employer.Employerid AS EmployerId,
        Employer.EmployerName,
        Employer.IsActive,
        Employer.LicenseCount,
        ISNULL(EmployeeCounts.EmployeeCount, 0) AS EmployeeCount,
        Employer.FailedAttempts,
        Employer.TimeZone,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.TEmployerDetails AS Employer
    LEFT JOIN (
        SELECT
            Employee.Employerid AS EmployerId,
            COUNT(*) AS EmployeeCount
        FROM dbo.TEmployee AS Employee
        GROUP BY Employee.Employerid
    ) AS EmployeeCounts
        ON EmployeeCounts.EmployerId = Employer.Employerid
    WHERE 1 = 1
        ${employerNameFilter(searchText(filters.q))}
    ORDER BY ${employerListOrder()}
    OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY
  `;
  return {
    rows: rows.map(mapEmployer),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging.page,
    pageSize: paging.pageSize,
  };
}

/** Shell switcher. Empty search is the first 20 employers, not the full table. */
export async function searchEmployers(
  db: HrmsDb,
  q?: string | null,
): Promise<EmployerLookup[]> {
  const rows = await db.$queryRaw<
    Array<{ EmployerId: number; EmployerName: string }>
  >`
    SELECT TOP (${Prisma.raw(String(LOOKUP_LIMIT))})
        Employer.Employerid AS EmployerId,
        Employer.EmployerName
    FROM dbo.TEmployerDetails AS Employer
    WHERE 1 = 1
        ${employerNameFilter(searchText(q))}
    ORDER BY Employer.Employerid ASC
  `;
  return rows.map((row) => ({
    employerId: row.EmployerId,
    employerName: row.EmployerName,
  }));
}

export async function getDatabaseHealth(db: HrmsDb): Promise<{
  ok: boolean;
  database?: string;
  error?: string;
  checkedAt: string;
}> {
  try {
    const health = await checkDatabase(db);
    return {
      ok: true,
      database: health.database,
      checkedAt: asIso(new Date()) ?? new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Database check failed.",
      checkedAt: new Date().toISOString(),
    };
  }
}
