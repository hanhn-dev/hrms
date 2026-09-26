import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";

export type EmployeeSearchHit = {
  employeeId: number;
  employmentNumber: string;
  fullName: string;
  workEmail: string | null;
  isActive: string | boolean | null;
  roleName: string | null;
};

export async function searchEmployees(
  db: HrmsDb,
  employerId: number,
  search: string,
): Promise<EmployeeSearchHit[]> {
  const tenantId = parseEmployerId(employerId);
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
  const rows = await db.$queryRaw<
    Array<{
      EmployeeId: number;
      EmploymentNumber: string;
      FullName: string;
      WorkEmail: string | null;
      IsActive: string | boolean | null;
      RoleName: string | null;
    }>
  >`
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
        ${nameFilter}
    ORDER BY Employee.EmployeeId ASC
  `;
  return rows.map((row) => ({
    employeeId: row.EmployeeId,
    employmentNumber: row.EmploymentNumber,
    fullName: row.FullName,
    workEmail: row.WorkEmail,
    isActive: row.IsActive,
    roleName: row.RoleName,
  }));
}
