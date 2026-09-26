import type { HrmsDb } from "../client";
import { asIso } from "../iso";
import { requireResolvedEmployee } from "./resolve";

export type EmployeeProfile = {
  employeeId: number;
  employmentNumber: string;
  employerId: number;
  employerName: string | null;
  fullName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  cellNumber: string | null;
  isActive: string | boolean | null;
  dateOfJoining: string | null;
  dateOfTermination: string | null;
  lastWorkingDate: string | null;
  designation: string | null;
  gradeId: number | null;
  employmentType: string | null;
  locationName: string | null;
  businessUnitName: string | null;
  functionalManagerName: string | null;
  reportsToName: string | null;
  userId: number | null;
  roleId: number | null;
  roleName: string | null;
  roleType: string | null;
  userEmployeeMappingCount: number;
};

type ProfileRow = {
  EmployeeId: number;
  EmploymentNumber: string;
  EmployerId: number;
  EmployerName: string | null;
  FullName: string;
  FName: string | null;
  MiddleName: string | null;
  LName: string | null;
  WorkEmail: string | null;
  PersonalEmailId: string | null;
  CellNumber: string | null;
  IsActive: string | boolean | null;
  DateOfJoining: Date | string | null;
  DateOfTermination: Date | string | null;
  LastWorkingDate: Date | string | null;
  Designation: string | null;
  GradeId: number | null;
  EmploymentType: string | null;
  LocationName: string | null;
  BusinessUnitName: string | null;
  FunctionalManagerName: string | null;
  ReportsToName: string | null;
  UserID: number | null;
  RoleID: number | null;
  RoleName: string | null;
  RoleType: string | null;
  UserEmployeeMappingCount: number;
};

export async function getEmployeeProfile(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
): Promise<EmployeeProfile | null> {
  const identity = await requireResolvedEmployee(db, employerId, employmentNumber);
  const rows = await db.$queryRaw<ProfileRow[]>`
    SELECT
        Employee.EmployeeId,
        EmployeeInfo.EmploymentNumber,
        Employee.Employerid AS EmployerId,
        Employer.EmployerName,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        Employee.FName,
        Employee.MiddleName,
        Employee.LName,
        Employee.EmailID AS WorkEmail,
        Employee.PersonalEmailId,
        Employee.CellNumber,
        Employee.IsActive,
        EmployeeInfo.DOJ AS DateOfJoining,
        EmployeeInfo.DOT AS DateOfTermination,
        EmployeeInfo.LastWorkingDate,
        Title.Title AS Designation,
        EmployeeInfo.Grade AS GradeId,
        EmploymentType.EmploymentType,
        Location.LocationName,
        BusinessUnit.UnitName AS BusinessUnitName,
        LTRIM(RTRIM(CONCAT_WS(' ', FunctionalEmployee.FName, FunctionalEmployee.MiddleName, FunctionalEmployee.LName))) AS FunctionalManagerName,
        LTRIM(RTRIM(CONCAT_WS(' ', ReportsEmployee.FName, ReportsEmployee.MiddleName, ReportsEmployee.LName))) AS ReportsToName,
        Users.UserID,
        Roles.RoleID,
        Roles.RoleName,
        Roles.RoleType,
        (
            SELECT COUNT(*)
            FROM dbo.TUserEmployee AS Mapping
            WHERE Mapping.EmployeeID = Employee.EmployeeId
        ) AS UserEmployeeMappingCount
    FROM dbo.TEmployee AS Employee
    INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    LEFT JOIN dbo.TEmployerDetails AS Employer
        ON Employer.Employerid = Employee.Employerid
    LEFT JOIN dbo.TTitle AS Title
        ON Title.ID = EmployeeInfo.Title
        AND Title.Employerid = EmployeeInfo.EmployerID
    LEFT JOIN dbo.TMEmploymentTypes AS EmploymentType
        ON EmploymentType.EmploymentTypeID = EmployeeInfo.EmploymentTypeID
    LEFT JOIN dbo.TLocation AS Location
        ON Location.LocationId = EmployeeInfo.LocationId
    LEFT JOIN dbo.TOrgHierarchyDetails AS BusinessUnit
        ON BusinessUnit.UnitID = EmployeeInfo.BusinessUnitId
    LEFT JOIN dbo.TEmployee AS FunctionalEmployee
        ON FunctionalEmployee.EmployeeId = EmployeeInfo.FunctionalManager
    LEFT JOIN dbo.TORGChart AS OrgChart
        ON OrgChart.EmployeeID = Employee.EmployeeId
    LEFT JOIN dbo.TEmployee AS ReportsEmployee
        ON ReportsEmployee.EmployeeId = OrgChart.ReportsTo
    LEFT JOIN dbo.TUserEmployee AS UserEmployee
        ON UserEmployee.UserID = ${identity.userId}
        AND UserEmployee.EmployeeID = Employee.EmployeeId
    LEFT JOIN dbo.TUsers AS Users
        ON Users.UserID = UserEmployee.UserID
        AND Users.Employerid = ${employerId}
    LEFT JOIN dbo.TRoles AS Roles
        ON Roles.RoleID = Users.RoleID
    WHERE Employee.EmployeeId = ${identity.employeeId}
        AND Employee.Employerid = ${employerId}
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
    firstName: row.FName,
    middleName: row.MiddleName,
    lastName: row.LName,
    workEmail: row.WorkEmail,
    personalEmail: row.PersonalEmailId,
    cellNumber: row.CellNumber,
    isActive: row.IsActive,
    dateOfJoining: asIso(row.DateOfJoining),
    dateOfTermination: asIso(row.DateOfTermination),
    lastWorkingDate: asIso(row.LastWorkingDate),
    designation: row.Designation,
    gradeId: row.GradeId,
    employmentType: row.EmploymentType,
    locationName: row.LocationName,
    businessUnitName: row.BusinessUnitName,
    functionalManagerName: row.FunctionalManagerName,
    reportsToName: row.ReportsToName,
    userId: row.UserID,
    roleId: row.RoleID,
    roleName: row.RoleName,
    roleType: row.RoleType,
    userEmployeeMappingCount: Number(row.UserEmployeeMappingCount),
  };
}
