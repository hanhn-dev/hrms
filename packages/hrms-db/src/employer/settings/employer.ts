import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";

export type EmployerSettings = {
  employerId: number;
  employerName: string;
  parentEmployerId: number | null;
  rootEmployerId: number | null;
  isActive: string | boolean | number | null;
  licenseCount: number | null;
  failedAttempts: number | null;
  passwordExpires: number | null;
  passwordChangeLimit: number | null;
  preventPasswords: number | null;
  timeZone: string | null;
  uiCulture: string | null;
  tabDetailsRowCount: number;
  userTabGrantCount: number;
  tabMasterNote: string;
};

export type LicensedModule = {
  moduleId: number;
  moduleName: string;
};

export async function getEmployerSettings(
  db: HrmsDb,
  employerId: number,
): Promise<EmployerSettings | null> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<
    Array<{
      EmployerId: number;
      EmployerName: string;
      ParentEmployerId: number | null;
      RootEmployerId: number | null;
      IsActive: string | boolean | number | null;
      LicenseCount: string | number | null;
      FailedAttempts: number | null;
      PasswordExpires: number | null;
      PasswordChangeLimit: number | null;
      PreventPasswords: number | null;
      TimeZone: string | null;
      UICulture: string | null;
      TabDetailsRowCount: number;
      UserTabGrantCount: number;
    }>
  >`
    SELECT
        Employer.Employerid AS EmployerId,
        Employer.EmployerName,
        Employer.ParentEmployerid AS ParentEmployerId,
        Employer.RootEmployerId,
        Employer.IsActive,
        Employer.LicenseCount,
        Employer.FailedAttempts,
        Employer.PasswordExpires,
        Employer.PasswordChangelimit AS PasswordChangeLimit,
        Employer.PreventPasswords,
        Employer.TimeZone,
        Employer.UICulture,
        (
            SELECT COUNT(*)
            FROM dbo.TTabDetails AS Tab
            WHERE Tab.Employerid = Employer.Employerid OR Tab.Employerid = 0
        ) AS TabDetailsRowCount,
        (
            SELECT COUNT(*)
            FROM dbo.TUserTabDetails AS UserTab
            WHERE UserTab.Employerid = Employer.Employerid
        ) AS UserTabGrantCount
    FROM dbo.TEmployerDetails AS Employer
    WHERE Employer.Employerid = ${tenantId}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  const tabDetailsRowCount = Number(row.TabDetailsRowCount);
  const userTabGrantCount = Number(row.UserTabGrantCount);
  const tabMasterNote =
    tabDetailsRowCount === 0 && userTabGrantCount > 0
      ? "TTabDetails has zero tenant or Employerid 0 rows while per-user tab grants exist. Runtime tabs will not show."
      : tabDetailsRowCount === 0
        ? "TTabDetails has zero tenant or Employerid 0 rows. Granted user tabs will not show at runtime."
        : "TTabDetails has master rows (tenant or Employerid 0).";
  return {
    employerId: row.EmployerId,
    employerName: row.EmployerName,
    parentEmployerId: row.ParentEmployerId,
    rootEmployerId: row.RootEmployerId,
    isActive: row.IsActive,
    licenseCount:
      row.LicenseCount == null || row.LicenseCount === ""
        ? null
        : Number(row.LicenseCount),
    failedAttempts: row.FailedAttempts,
    passwordExpires: row.PasswordExpires,
    passwordChangeLimit: row.PasswordChangeLimit,
    preventPasswords: row.PreventPasswords,
    timeZone: row.TimeZone,
    uiCulture: row.UICulture,
    tabDetailsRowCount,
    userTabGrantCount,
    tabMasterNote,
  };
}

export async function listLicensedModules(
  db: HrmsDb,
  employerId: number,
): Promise<LicensedModule[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<Array<{ ModuleId: number; ModuleName: string }>>`
    SELECT DISTINCT
        Module.ModuleId,
        Module.ModuleName
    FROM dbo.THrmsModules AS Module
    INNER JOIN dbo.TEmployerModule AS EmployerModule
        ON EmployerModule.HrmsModuleID = Module.ModuleId
    INNER JOIN dbo.TEmployerDetails AS Employer
        ON Employer.Employerid = ${tenantId}
    WHERE Module.IsActive = 1
        AND EmployerModule.IsActive = 1
        AND EmployerModule.EmployerId = ISNULL(Employer.RootEmployerId, ${tenantId})
    ORDER BY Module.ModuleName
  `;
  return rows.map((row) => ({
    moduleId: row.ModuleId,
    moduleName: row.ModuleName,
  }));
}
