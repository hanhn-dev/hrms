import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import {
  LOCATION_BU_IDS_MAX_LENGTH,
  normalizeCommaIdList,
  parseCommaIdList,
  parseEmployerId,
  roleIdSchema,
} from "../../shared/ids";

export {
  LOCATION_BU_IDS_MAX_LENGTH,
  employeeMatchesLocationBuScope,
  mergeAccessIdLists,
  normalizeCommaIdList,
  parseCommaIdList,
} from "../../shared/ids";

export type RoleLocationBuScope = {
  roleId: number;
  employerId: number;
  locationIds: string | null;
  businessUnitIds: string | null;
  pageRowCount: number;
  distinctLocationValues: number;
  distinctBusinessUnitValues: number;
  rowsDisagree: boolean;
  matchingEmployeeCount: number;
};

export async function countEmployeesInLocationBuScope(
  db: HrmsDb,
  employerId: number,
  locationIds: string | null,
  businessUnitIds: string | null,
): Promise<number> {
  const tenantId = parseEmployerId(employerId);
  const locationFilter = parseCommaIdList(locationIds);
  const buFilter = parseCommaIdList(businessUnitIds);

  if (locationFilter.length === 0 && buFilter.length === 0) {
    const rows = await db.$queryRaw<Array<{ MatchingCount: number }>>`
      SELECT COUNT(*) AS MatchingCount
      FROM dbo.TEmployee AS Employee
      INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
          ON EmployeeInfo.EmployeeId = Employee.EmployeeId
      INNER JOIN dbo.TLocation AS Location
          ON Location.LocationId = EmployeeInfo.LocationId
      INNER JOIN dbo.TOrgHierarchyDetails AS OrgUnit
          ON OrgUnit.UnitID = EmployeeInfo.BusinessUnitId
          AND OrgUnit.IsActive = 'Y'
      WHERE Employee.Employerid = ${tenantId}
          AND Employee.IsActive IN ('Y', 'N')
    `;
    return Number(rows[0]?.MatchingCount ?? 0);
  }

  if (locationFilter.length > 0 && buFilter.length === 0) {
    const rows = await db.$queryRaw<Array<{ MatchingCount: number }>>`
      SELECT COUNT(*) AS MatchingCount
      FROM dbo.TEmployee AS Employee
      INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
          ON EmployeeInfo.EmployeeId = Employee.EmployeeId
      INNER JOIN dbo.TLocation AS Location
          ON Location.LocationId = EmployeeInfo.LocationId
      INNER JOIN dbo.TOrgHierarchyDetails AS OrgUnit
          ON OrgUnit.UnitID = EmployeeInfo.BusinessUnitId
          AND OrgUnit.IsActive = 'Y'
      WHERE Employee.Employerid = ${tenantId}
          AND Employee.IsActive IN ('Y', 'N')
          AND EmployeeInfo.LocationId IN (${Prisma.join(locationFilter)})
    `;
    return Number(rows[0]?.MatchingCount ?? 0);
  }

  if (locationFilter.length === 0 && buFilter.length > 0) {
    const rows = await db.$queryRaw<Array<{ MatchingCount: number }>>`
      SELECT COUNT(*) AS MatchingCount
      FROM dbo.TEmployee AS Employee
      INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
          ON EmployeeInfo.EmployeeId = Employee.EmployeeId
      INNER JOIN dbo.TLocation AS Location
          ON Location.LocationId = EmployeeInfo.LocationId
      INNER JOIN dbo.TOrgHierarchyDetails AS OrgUnit
          ON OrgUnit.UnitID = EmployeeInfo.BusinessUnitId
          AND OrgUnit.IsActive = 'Y'
      WHERE Employee.Employerid = ${tenantId}
          AND Employee.IsActive IN ('Y', 'N')
          AND EmployeeInfo.BusinessUnitId IN (${Prisma.join(buFilter)})
    `;
    return Number(rows[0]?.MatchingCount ?? 0);
  }

  const rows = await db.$queryRaw<Array<{ MatchingCount: number }>>`
    SELECT COUNT(*) AS MatchingCount
    FROM dbo.TEmployee AS Employee
    INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    INNER JOIN dbo.TLocation AS Location
        ON Location.LocationId = EmployeeInfo.LocationId
    INNER JOIN dbo.TOrgHierarchyDetails AS OrgUnit
        ON OrgUnit.UnitID = EmployeeInfo.BusinessUnitId
        AND OrgUnit.IsActive = 'Y'
    WHERE Employee.Employerid = ${tenantId}
        AND Employee.IsActive IN ('Y', 'N')
        AND EmployeeInfo.LocationId IN (${Prisma.join(locationFilter)})
        AND EmployeeInfo.BusinessUnitId IN (${Prisma.join(buFilter)})
  `;
  return Number(rows[0]?.MatchingCount ?? 0);
}

export async function getRoleLocationBuScope(
  db: HrmsDb,
  employerId: number,
  roleId: number,
): Promise<RoleLocationBuScope | null> {
  const tenantId = parseEmployerId(employerId);
  const parsedRoleId = roleIdSchema.parse(roleId);

  const rows = await db.$queryRaw<
    Array<{
      LocationIds: string | null;
      BusinessUnitIds: string | null;
      PageRowCount: number;
      DistinctLocationValues: number;
      DistinctBusinessUnitValues: number;
    }>
  >`
    SELECT
        MAX(RolePages.LocationIds) AS LocationIds,
        MAX(RolePages.BusinessUnitIds) AS BusinessUnitIds,
        COUNT(*) AS PageRowCount,
        COUNT(DISTINCT ISNULL(RolePages.LocationIds, N'')) AS DistinctLocationValues,
        COUNT(DISTINCT ISNULL(RolePages.BusinessUnitIds, N'')) AS DistinctBusinessUnitValues
    FROM dbo.TRolePagesMapping AS RolePages
    WHERE RolePages.RoleID = ${parsedRoleId}
        AND RolePages.Employerid = ${tenantId}
  `;

  const row = rows[0];
  if (!row || Number(row.PageRowCount) === 0) {
    return null;
  }

  const locationIds =
    row.LocationIds == null || String(row.LocationIds).trim() === ""
      ? null
      : String(row.LocationIds);
  const businessUnitIds =
    row.BusinessUnitIds == null || String(row.BusinessUnitIds).trim() === ""
      ? null
      : String(row.BusinessUnitIds);

  const rowsDisagree =
    Number(row.DistinctLocationValues) > 1 ||
    Number(row.DistinctBusinessUnitValues) > 1;

  const matchingEmployeeCount = await countEmployeesInLocationBuScope(
    db,
    tenantId,
    locationIds,
    businessUnitIds,
  );

  return {
    roleId: parsedRoleId,
    employerId: tenantId,
    locationIds,
    businessUnitIds,
    pageRowCount: Number(row.PageRowCount),
    distinctLocationValues: Number(row.DistinctLocationValues),
    distinctBusinessUnitValues: Number(row.DistinctBusinessUnitValues),
    rowsDisagree,
    matchingEmployeeCount,
  };
}

export async function setRoleLocationBu(
  db: HrmsDb,
  input: {
    employerId: number;
    roleId: number;
    locationIds: string | null | undefined;
    businessUnitIds: string | null | undefined;
    updatedBy: number;
  },
): Promise<RoleLocationBuScope> {
  const tenantId = parseEmployerId(input.employerId);
  const parsedRoleId = roleIdSchema.parse(input.roleId);
  const locationIds = normalizeCommaIdList(input.locationIds);
  const businessUnitIds = normalizeCommaIdList(input.businessUnitIds);
  const updatedBy = input.updatedBy;

  const existing = await db.$queryRaw<Array<{ PageRowCount: number }>>`
    SELECT COUNT(*) AS PageRowCount
    FROM dbo.TRolePagesMapping AS RolePages
    WHERE RolePages.RoleID = ${parsedRoleId}
        AND RolePages.Employerid = ${tenantId}
  `;
  if (Number(existing[0]?.PageRowCount ?? 0) === 0) {
    throw new Error(
      "Role has no TRolePagesMapping rows for this employer — grant pages first.",
    );
  }

  await db.$transaction(async (tx) => {
    const nextTrans = await tx.$queryRaw<Array<{ NextTransId: number }>>`
      SELECT ISNULL(MAX(RolePageHistory.Transid), 0) + 1 AS NextTransId
      FROM dbo.TRolePagesMappingHistory AS RolePageHistory
      WHERE RolePageHistory.Employerid = ${tenantId}
    `;
    const pageHistoryTransId = Number(nextTrans[0]?.NextTransId ?? 1);

    await tx.$executeRaw`
      INSERT INTO dbo.TRolePagesMappingHistory (
          Transid,
          RoleID,
          PageId,
          ModifiedBy,
          ModifyDate,
          Employerid,
          ModifyDateUtcTime,
          LocationIds,
          BusinessUnitIds
      )
      SELECT
          ${pageHistoryTransId},
          RolePages.RoleID,
          RolePages.PageId,
          ${updatedBy},
          GETDATE(),
          RolePages.Employerid,
          GETUTCDATE(),
          RolePages.LocationIds,
          RolePages.BusinessUnitIds
      FROM dbo.TRolePagesMapping AS RolePages
      WHERE RolePages.RoleID = ${parsedRoleId}
          AND RolePages.Employerid = ${tenantId}
    `;

    await tx.$executeRaw`
      UPDATE RolePages
      SET
          RolePages.LocationIds = ${locationIds},
          RolePages.BusinessUnitIds = ${businessUnitIds},
          RolePages.UpdatedBy = ${updatedBy},
          RolePages.UpdatedDate = GETDATE()
      FROM dbo.TRolePagesMapping AS RolePages
      WHERE RolePages.RoleID = ${parsedRoleId}
          AND RolePages.Employerid = ${tenantId}
    `;
  });

  const after = await getRoleLocationBuScope(db, tenantId, parsedRoleId);
  if (!after) {
    throw new Error("Role Location/BU scope missing after update.");
  }
  return after;
}
