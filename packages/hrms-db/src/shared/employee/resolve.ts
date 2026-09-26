import type { HrmsDb } from "../client";
import { parseEmployerId, parseEmploymentNumber } from "../ids";

export type ResolvedEmployee = {
  employeeId: number;
  employmentNumber: string;
  employerId: number;
  employerName: string | null;
  fullName: string;
  workEmail: string | null;
  isActive: string | boolean | null;
  userId: number | null;
  userEmployeeMappingCount: number;
  roleId: number | null;
  roleName: string | null;
  roleType: string | null;
};

type ResolveRow = {
  EmployeeId: number;
  EmploymentNumber: string;
  EmployerId: number;
  EmployerName: string | null;
  FullName: string;
  WorkEmail: string | null;
  IsActive: string | boolean | null;
  UserId: number | null;
  UserEmployeeMappingCount: number;
  RoleId: number | null;
  RoleName: string | null;
  RoleType: string | null;
};

export async function resolveEmployee(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
): Promise<ResolvedEmployee | null> {
  const tenantId = parseEmployerId(employerId);
  const number = parseEmploymentNumber(employmentNumber);
  const rows = await db.$queryRaw<ResolveRow[]>`
    SELECT TOP (1)
        Employee.EmployeeId,
        EmployeeInfo.EmploymentNumber,
        Employee.Employerid AS EmployerId,
        Employer.EmployerName,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        Employee.EmailID AS WorkEmail,
        Employee.IsActive,
        Users.UserID AS UserId,
        (
            SELECT COUNT(*)
            FROM dbo.TUserEmployee AS Mapping
            WHERE Mapping.EmployeeID = Employee.EmployeeId
        ) AS UserEmployeeMappingCount,
        Roles.RoleID AS RoleId,
        Roles.RoleName,
        Roles.RoleType
    FROM dbo.TEmployee AS Employee
    INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    LEFT JOIN dbo.TEmployerDetails AS Employer
        ON Employer.Employerid = Employee.Employerid
    LEFT JOIN dbo.TUserEmployee AS UserEmployee
        ON UserEmployee.EmployeeID = Employee.EmployeeId
    LEFT JOIN dbo.TUsers AS Users
        ON Users.UserID = UserEmployee.UserID
        AND Users.Employerid = ${tenantId}
    LEFT JOIN dbo.TRoles AS Roles
        ON Roles.RoleID = Users.RoleID
    WHERE Employee.Employerid = ${tenantId}
        AND EmployeeInfo.EmploymentNumber = ${number}
    ORDER BY Users.UserID DESC
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    employeeId: row.EmployeeId,
    employmentNumber: row.EmploymentNumber,
    employerId: row.EmployerId,
    employerName: row.EmployerName,
    fullName: row.FullName,
    workEmail: row.WorkEmail,
    isActive: row.IsActive,
    userId: row.UserId,
    userEmployeeMappingCount: Number(row.UserEmployeeMappingCount),
    roleId: row.RoleId,
    roleName: row.RoleName,
    roleType: row.RoleType,
  };
}

export async function requireResolvedEmployee(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
): Promise<ResolvedEmployee> {
  const employee = await resolveEmployee(db, employerId, employmentNumber);
  if (!employee) {
    throw new Error(
      `Employee ${employmentNumber} was not found for employer ${employerId}.`,
    );
  }
  return employee;
}
