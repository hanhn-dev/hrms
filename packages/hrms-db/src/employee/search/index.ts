import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import {
  employeeListSectionCountJoins,
  employeeListSectionCountSelect,
} from "../sections/list-joins";
import type { EmployeeSectionCountFields } from "../sections/list-columns";

export type EmployeeSearchHit = {
  employeeId: number;
  employmentNumber: string;
  fullName: string;
  workEmail: string | null;
  isActive: string | boolean | null;
  roleName: string | null;
} & EmployeeSectionCountFields;

type SearchRow = {
  EmployeeId: number;
  EmploymentNumber: string;
  FullName: string;
  WorkEmail: string | null;
  IsActive: string | boolean | null;
  RoleName: string | null;
  SkillCount: number;
  DomainCount: number;
  PassportVisaCount: number;
  PastEmploymentCount: number;
  BankCount: number;
  NominationCount: number;
  EducationCount: number;
  FamilyCount: number;
  NomineeCount: number;
  ContactCount: number;
  EmergencyCount: number;
  CertificationCount: number;
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
  const rows = await db.$queryRaw<SearchRow[]>`
    SELECT
        Employee.EmployeeId,
        EmployeeInfo.EmploymentNumber,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        Employee.EmailID AS WorkEmail,
        Employee.IsActive,
        Roles.RoleName,
        ${employeeListSectionCountSelect}
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
    ${employeeListSectionCountJoins(tenantId)}
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
    skillCount: Number(row.SkillCount),
    domainCount: Number(row.DomainCount),
    passportVisaCount: Number(row.PassportVisaCount),
    pastEmploymentCount: Number(row.PastEmploymentCount),
    bankCount: Number(row.BankCount),
    nominationCount: Number(row.NominationCount),
    educationCount: Number(row.EducationCount),
    familyCount: Number(row.FamilyCount),
    nomineeCount: Number(row.NomineeCount),
    contactCount: Number(row.ContactCount),
    emergencyCount: Number(row.EmergencyCount),
    certificationCount: Number(row.CertificationCount),
  }));
}
