import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, roleIdSchema } from "../../shared/ids";

export type RoleRow = {
  roleId: number;
  roleName: string;
  isDefault: number | boolean | null;
  isActive: string | boolean | null;
  employerId: number | null;
  roleType: string | null;
  reportingTypeName: string | null;
  pageGrantCount: number;
  roleTabGrantCount: number;
  userCount: number;
};

export type RolePageGrant = {
  roleId: number;
  roleName: string | null;
  menuId: number;
  menuName: string | null;
  masterIsActive: number | boolean | null;
};

export async function listRoles(db: HrmsDb, employerId: number): Promise<RoleRow[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<
    Array<{
      RoleID: number;
      RoleName: string;
      IsDefault: number | boolean | null;
      IsActive: string | boolean | null;
      Employerid: number | null;
      RoleType: string | null;
      ReportingTypeName: string | null;
      PageGrantCount: number;
      RoleTabGrantCount: number;
      UserCount: number;
    }>
  >`
    SELECT
        Roles.RoleID,
        Roles.RoleName,
        Roles.IsDefault,
        Roles.IsActive,
        Roles.Employerid,
        Roles.RoleType,
        ReportingRole.RoleName AS ReportingTypeName,
        (
            SELECT COUNT(*)
            FROM dbo.TRolePagesMapping AS RolePages
            WHERE RolePages.RoleID = Roles.RoleID
                AND RolePages.Employerid = ${tenantId}
        ) AS PageGrantCount,
        (
            SELECT COUNT(*)
            FROM dbo.TRoleTabDetails AS RoleTabs
            WHERE RoleTabs.RoleId = Roles.RoleID
                AND RoleTabs.Employerid = ${tenantId}
        ) AS RoleTabGrantCount,
        (
            SELECT COUNT(*)
            FROM dbo.TUsers AS Users
            WHERE Users.RoleID = Roles.RoleID
                AND Users.Employerid = ${tenantId}
        ) AS UserCount
    FROM dbo.TRoles AS Roles
    LEFT JOIN dbo.TRoles AS ReportingRole
        ON ReportingRole.RoleID = Roles.ReportingType
    WHERE (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = ${tenantId}))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = ${tenantId})
        )
    ORDER BY Roles.IsDefault DESC, Roles.RoleName
  `;
  return rows.map((row) => ({
    roleId: row.RoleID,
    roleName: row.RoleName,
    isDefault: row.IsDefault,
    isActive: row.IsActive,
    employerId: row.Employerid,
    roleType: row.RoleType,
    reportingTypeName: row.ReportingTypeName,
    pageGrantCount: Number(row.PageGrantCount),
    roleTabGrantCount: Number(row.RoleTabGrantCount),
    userCount: Number(row.UserCount),
  }));
}

export async function listRolePageGrants(
  db: HrmsDb,
  employerId: number,
  roleId: number | null,
): Promise<RolePageGrant[]> {
  const tenantId = parseEmployerId(employerId);
  if (!roleId) {
    return [];
  }
  const parsedRoleId = roleIdSchema.parse(roleId);
  const rows = await db.$queryRaw<
    Array<{
      RoleID: number;
      RoleName: string | null;
      MenuId: number;
      MenuName: string | null;
      MasterIsActive: number | boolean | null;
    }>
  >`
    SELECT
        RolePages.RoleID,
        Roles.RoleName,
        RolePages.PageId AS MenuId,
        Menu.MenuName,
        Menu.ISActive AS MasterIsActive
    FROM dbo.TRolePagesMapping AS RolePages
    LEFT JOIN dbo.TRoles AS Roles
        ON Roles.RoleID = RolePages.RoleID
    LEFT JOIN dbo.tMenuDetails AS Menu
        ON Menu.MenuId = RolePages.PageId
        AND Menu.Employerid = RolePages.Employerid
    WHERE RolePages.Employerid = ${tenantId}
        AND RolePages.RoleID = ${parsedRoleId}
    ORDER BY Menu.MenuName
  `;
  return rows.map((row) => ({
    roleId: row.RoleID,
    roleName: row.RoleName,
    menuId: row.MenuId,
    menuName: row.MenuName,
    masterIsActive: row.MasterIsActive,
  }));
}
