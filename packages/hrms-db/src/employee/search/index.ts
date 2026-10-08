import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { presentTables } from "../../shared/objects";
import {
  employeeListSectionCountJoins,
  employeeListSectionCountSelect,
} from "../sections/list-joins";
import {
  EMPLOYEE_LIST_SECTION_COLUMNS,
  sectionCountTableNames,
  unavailableSectionCounts,
  type EmployeeSectionCountFields,
  type UnavailableSection,
} from "../sections/list-columns";

export type EmployeeSearchHit = {
  employeeId: number;
  employmentNumber: string;
  fullName: string;
  workEmail: string | null;
  /** Active, Active-Resigned, or InActive — same rule as SP_EMPMD_GetEmpSummaryData. */
  employeeStatus: string | null;
  roleName: string | null;
} & EmployeeSectionCountFields;

export type EmployeeSearchResult = {
  hits: EmployeeSearchHit[];
  unavailable: UnavailableSection[];
};

type SearchRow = {
  EmployeeId: number;
  EmploymentNumber: string;
  FullName: string;
  WorkEmail: string | null;
  EmployeeStatus: string | null;
  RoleName: string | null;
  SkillCount: number | null;
  DomainCount: number | null;
  PassportVisaCount: number | null;
  PastEmploymentCount: number | null;
  BankCount: number | null;
  NominationCount: number | null;
  EducationCount: number | null;
  FamilyCount: number | null;
  NomineeCount: number | null;
  ContactCount: number | null;
  EmergencyCount: number | null;
  CertificationCount: number | null;
};

function countValue(value: number | null): number | null {
  return value == null ? null : Number(value);
}

export async function searchEmployees(
  db: HrmsDb,
  employerId: number,
  search: string,
): Promise<EmployeeSearchResult> {
  const tenantId = parseEmployerId(employerId);
  const present = await presentTables(db, sectionCountTableNames());
  const unavailable = unavailableSectionCounts(present);
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
        CASE
            WHEN Employee.IsActive = 'Y' AND Separation.EmployeeId IS NOT NULL THEN 'Active-Resigned'
            WHEN Employee.IsActive = 'Y' AND Separation.EmployeeId IS NULL THEN 'Active'
            WHEN Employee.IsActive = 'N' THEN 'InActive'
        END AS EmployeeStatus,
        Roles.RoleName,
        ${employeeListSectionCountSelect(present)}
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
    OUTER APPLY (
        SELECT TOP (1)
            CASE
                WHEN rw.RequestType = 'ResignationPullback'
                    AND RD.ApproveStatus = 'Approved'
                    AND rw.ApproveStatus = 'C'
                THEN NULL
                ELSE RD.EmployeeId
            END AS EmployeeId
        FROM dbo.TResignationDetails AS RD
        INNER JOIN dbo.TSeparationType AS ST
            ON ST.SeparationTypeId = RD.SeparationTypeId
            AND RD.EmployeeId = Employee.EmployeeId
        INNER JOIN dbo.TRequestWorkflows AS rw
            ON RD.ResignationDetailId = rw.RequestTransid
            AND rw.RequestType IN ('ResignationDetails', 'ResignationPullback')
            AND RD.ApproveStatus IN ('Pending', 'Approved', 'Pullback')
        ORDER BY rw.Transid DESC
    ) AS Separation
    ${employeeListSectionCountJoins(tenantId, present)}
    WHERE Employee.Employerid = ${tenantId}
        ${nameFilter}
    ORDER BY Employee.EmployeeId ASC
  `;
  const hits = rows.map((row) => {
    const counts = Object.fromEntries(
      EMPLOYEE_LIST_SECTION_COLUMNS.map((column) => [
        column.field,
        countValue(row[column.countColumn]),
      ]),
    ) as EmployeeSectionCountFields;
    return {
      employeeId: row.EmployeeId,
      employmentNumber: row.EmploymentNumber,
      fullName: row.FullName,
      workEmail: row.WorkEmail,
      employeeStatus: row.EmployeeStatus,
      roleName: row.RoleName,
      ...counts,
    };
  });
  return { hits, unavailable };
}
