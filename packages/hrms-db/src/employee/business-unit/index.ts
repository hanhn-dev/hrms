import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { resolveEmployee } from "../../shared/employee";

export type BusinessUnitEmployee = {
  employeeId: number;
  employmentNumber: string;
  fullName: string;
  workEmail: string | null;
  isActive: string | boolean | null;
  roleName: string | null;
};

export type BusinessUnitEmployees = {
  currentEmployeeId: number;
  businessUnitId: number | null;
  businessUnitName: string | null;
  employees: BusinessUnitEmployee[];
};

type SubjectRow = {
  BusinessUnitId: number | null;
  BusinessUnitName: string | null;
};

type SiblingRow = {
  EmployeeId: number;
  EmploymentNumber: string;
  FullName: string;
  WorkEmail: string | null;
  IsActive: string | boolean | null;
  RoleName: string | null;
};

export async function listBusinessUnitEmployees(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
  search: string,
): Promise<BusinessUnitEmployees | null> {
  const tenantId = parseEmployerId(employerId);
  const identity = await resolveEmployee(db, employerId, employmentNumber);
  if (!identity) {
    return null;
  }

  const subjectRows = await db.$queryRaw<SubjectRow[]>`
    SELECT
        EmployeeInfo.BusinessUnitId,
        BusinessUnit.UnitName AS BusinessUnitName
    FROM dbo.TEmployee AS Employee
    INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
        AND EmployeeInfo.EmployerID = ${tenantId}
    LEFT JOIN dbo.TOrgHierarchyDetails AS BusinessUnit
        ON BusinessUnit.UnitID = EmployeeInfo.BusinessUnitId
        AND BusinessUnit.Employerid = ${tenantId}
    WHERE Employee.EmployeeId = ${identity.employeeId}
        AND Employee.Employerid = ${tenantId}
  `;
  const subject = subjectRows[0];
  const businessUnitId = subject?.BusinessUnitId ?? null;
  const businessUnitName = subject?.BusinessUnitName ?? null;

  if (businessUnitId == null) {
    return {
      currentEmployeeId: identity.employeeId,
      businessUnitId: null,
      businessUnitName: null,
      employees: [],
    };
  }

  const trimmed = search.trim();
  const nameFilter =
    trimmed === ""
      ? Prisma.empty
      : Prisma.sql`AND (
            EmployeeInfo.EmploymentNumber LIKE ${`%${trimmed}%`}
            OR Employee.FName LIKE ${`%${trimmed}%`}
            OR Employee.LName LIKE ${`%${trimmed}%`}
            OR Employee.EmailID LIKE ${`%${trimmed}%`}
        )`;

  const rows = await db.$queryRaw<SiblingRow[]>`
    SELECT
        Employee.EmployeeId,
        EmployeeInfo.EmploymentNumber,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        Employee.EmailID AS WorkEmail,
        Employee.IsActive,
        Roles.RoleName
    FROM dbo.TEmployee AS Employee
    INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    OUTER APPLY (
        SELECT TOP (1)
            UserEmployee.UserID
        FROM dbo.TUserEmployee AS UserEmployee
        WHERE UserEmployee.EmployeeID = Employee.EmployeeId
        ORDER BY UserEmployee.UserID DESC
    ) AS LatestUser
    LEFT JOIN dbo.TUsers AS Users
        ON Users.UserID = LatestUser.UserID
        AND Users.Employerid = ${tenantId}
    LEFT JOIN dbo.TRoles AS Roles
        ON Roles.RoleID = Users.RoleID
    WHERE Employee.Employerid = ${tenantId}
        AND EmployeeInfo.BusinessUnitId = ${businessUnitId}
        ${nameFilter}
    ORDER BY Employee.EmployeeId ASC
  `;

  return {
    currentEmployeeId: identity.employeeId,
    businessUnitId,
    businessUnitName,
    employees: rows.map((row) => ({
      employeeId: row.EmployeeId,
      employmentNumber: row.EmploymentNumber,
      fullName: row.FullName,
      workEmail: row.WorkEmail,
      isActive: row.IsActive,
      roleName: row.RoleName,
    })),
  };
}
