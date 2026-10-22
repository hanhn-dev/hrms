import type { HrmsDb } from "../../shared/client";
import {
  employeeMatchesLocationBuScope,
  mergeAccessIdLists,
  parseEmployerId,
  userIdSchema,
} from "../../shared/ids";
import { countEmployeesInLocationBuScope } from "../../employer/roles/location-bu";

export type EmployeeLocationBuScope = {
  userId: number | null;
  roleId: number | null;
  employerId: number;
  employeeLocationId: number | null;
  employeeBusinessUnitId: number | null;
  userLocationIds: string | null;
  userBusinessUnitIds: string | null;
  roleLocationIds: string | null;
  roleBusinessUnitIds: string | null;
  effectiveLocationIds: string | null;
  effectiveBusinessUnitIds: string | null;
  employeeInScope: boolean;
  matchingEmployeeCount: number;
};

function nullIfBlank(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") {
    return null;
  }
  return String(value);
}

/**
 * Resolve the Location/BU scope that FN_LocationBU_GetEmployeeDetails_Clone
 * would apply for this login (user map merged with role map).
 */
export async function getEmployeeLocationBuScope(
  db: HrmsDb,
  input: {
    employerId: number;
    employeeId: number;
    userId: number | null;
    roleId: number | null;
  },
): Promise<EmployeeLocationBuScope> {
  const tenantId = parseEmployerId(input.employerId);
  const userId =
    input.userId == null ? null : userIdSchema.parse(input.userId);

  const employeeRows = await db.$queryRaw<
    Array<{ LocationId: number | null; BusinessUnitId: number | null }>
  >`
    SELECT
        EmployeeInfo.LocationId,
        EmployeeInfo.BusinessUnitId
    FROM dbo.TEmployeeInfo AS EmployeeInfo
    WHERE EmployeeInfo.EmployeeId = ${input.employeeId}
  `;
  const employeeLocationId = employeeRows[0]?.LocationId ?? null;
  const employeeBusinessUnitId = employeeRows[0]?.BusinessUnitId ?? null;

  let userLocationIds: string | null = null;
  let userBusinessUnitIds: string | null = null;
  if (userId != null) {
    const userMap = await db.$queryRaw<
      Array<{ LocationIds: string | null; BusinessUnitIds: string | null }>
    >`
      SELECT TOP 1
          UserPages.LocationIds,
          UserPages.BusinessUnitIds
      FROM dbo.TUSerPagesMapping AS UserPages
      WHERE UserPages.UserID = ${userId}
          AND UserPages.Employerid = ${tenantId}
    `;
    userLocationIds = nullIfBlank(userMap[0]?.LocationIds);
    userBusinessUnitIds = nullIfBlank(userMap[0]?.BusinessUnitIds);
  }

  let roleLocationIds: string | null = null;
  let roleBusinessUnitIds: string | null = null;
  if (input.roleId != null) {
    const roleMap = await db.$queryRaw<
      Array<{ LocationIds: string | null; BusinessUnitIds: string | null }>
    >`
      SELECT TOP 1
          RolePages.LocationIds,
          RolePages.BusinessUnitIds
      FROM dbo.TRolePagesMapping AS RolePages
      WHERE RolePages.RoleID = ${input.roleId}
          AND RolePages.Employerid = ${tenantId}
    `;
    roleLocationIds = nullIfBlank(roleMap[0]?.LocationIds);
    roleBusinessUnitIds = nullIfBlank(roleMap[0]?.BusinessUnitIds);
  }

  const effectiveLocationIds = mergeAccessIdLists(
    userLocationIds,
    roleLocationIds,
  );
  const effectiveBusinessUnitIds = mergeAccessIdLists(
    userBusinessUnitIds,
    roleBusinessUnitIds,
  );

  const employeeInScope = employeeMatchesLocationBuScope({
    locationId: employeeLocationId,
    businessUnitId: employeeBusinessUnitId,
    locationIds: effectiveLocationIds,
    businessUnitIds: effectiveBusinessUnitIds,
  });

  const matchingEmployeeCount = await countEmployeesInLocationBuScope(
    db,
    tenantId,
    effectiveLocationIds,
    effectiveBusinessUnitIds,
  );

  return {
    userId,
    roleId: input.roleId,
    employerId: tenantId,
    employeeLocationId,
    employeeBusinessUnitId,
    userLocationIds,
    userBusinessUnitIds,
    roleLocationIds,
    roleBusinessUnitIds,
    effectiveLocationIds,
    effectiveBusinessUnitIds,
    employeeInScope,
    matchingEmployeeCount,
  };
}
