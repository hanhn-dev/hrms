import type { HrmsDb } from "../client";
import { asIso } from "../iso";
import { checkDatabase } from "../client";

export type EmployerListItem = {
  employerId: number;
  employerName: string;
  isActive: string | boolean | number | null;
  licenseCount: number | null;
  employeeCount: number;
  failedAttempts: number | null;
  timeZone: string | null;
};

export async function listEmployers(db: HrmsDb): Promise<EmployerListItem[]> {
  const rows = await db.$queryRaw<
    Array<{
      EmployerId: number;
      EmployerName: string;
      IsActive: string | boolean | number | null;
      LicenseCount: string | number | null;
      EmployeeCount: number;
      FailedAttempts: number | null;
      TimeZone: string | null;
    }>
  >`
    SELECT
        Employer.Employerid AS EmployerId,
        Employer.EmployerName,
        Employer.IsActive,
        Employer.LicenseCount,
        ISNULL(EmployeeCounts.EmployeeCount, 0) AS EmployeeCount,
        Employer.FailedAttempts,
        Employer.TimeZone
    FROM dbo.TEmployerDetails AS Employer
    LEFT JOIN (
        SELECT
            Employee.Employerid AS EmployerId,
            COUNT(*) AS EmployeeCount
        FROM dbo.TEmployee AS Employee
        GROUP BY Employee.Employerid
    ) AS EmployeeCounts
        ON EmployeeCounts.EmployerId = Employer.Employerid
    ORDER BY Employer.Employerid ASC
  `;
  return rows.map((row) => ({
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
