import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, roleIdSchema } from "../../shared/ids";
import {
  likeContains,
  pageQuery,
  searchText,
  totalCountOf,
  type PageResult,
} from "../../shared/page.ts";

export {
  LOCATION_BU_IDS_MAX_LENGTH,
  countEmployeesInLocationBuScope,
  employeeMatchesLocationBuScope,
  getRoleLocationBuScope,
  mergeAccessIdLists,
  normalizeCommaIdList,
  parseCommaIdList,
  setRoleLocationBu,
  type RoleLocationBuScope,
} from "./location-bu";
export {
  buildOrgUnitTree,
  collectOrgUnitIds,
  listEmployerBusinessUnits,
  listEmployerLocations,
  withMissingBusinessUnitOptions,
  withMissingLocationOptions,
  type EmployerBusinessUnitOption,
  type EmployerLocationOption,
  type OrgUnitTreeNode,
} from "./scope-options";

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

export type RoleListPage = PageResult<RoleRow>;
export type RoleGrantPage = PageResult<RolePageGrant>;

function textFilter(q: string | null, sql: Prisma.Sql): Prisma.Sql {
  if (q == null) {
    return Prisma.empty;
  }
  return sql;
}

export async function listRoles(
  db: HrmsDb,
  employerId: number,
  filters: { page?: number | null; q?: string | null } = {},
): Promise<RoleListPage> {
  const tenantId = parseEmployerId(employerId);
  const paging = pageQuery(filters.page);
  const q = searchText(filters.q);
  const pattern = q == null ? null : likeContains(q);
  const nameFilter = textFilter(
    q,
    Prisma.sql`AND (
        Roles.RoleName LIKE ${pattern}
        OR Roles.RoleType LIKE ${pattern}
        OR ReportingRole.RoleName LIKE ${pattern}
        OR CONVERT(NVARCHAR(20), Roles.RoleID) LIKE ${pattern}
    )`,
  );
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
      TotalCount: number | bigint | null;
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
        ) AS UserCount,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.TRoles AS Roles
    LEFT JOIN dbo.TRoles AS ReportingRole
        ON ReportingRole.RoleID = Roles.ReportingType
    WHERE (
            (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = ${tenantId}))
            OR (Roles.IsDefault = 0 AND Roles.Employerid = ${tenantId})
        )
        ${nameFilter}
    ORDER BY Roles.IsDefault DESC, Roles.RoleName, Roles.RoleID
    OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY
  `;
  return {
    rows: rows.map((row) => ({
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
    })),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging.page,
    pageSize: paging.pageSize,
  };
}

export async function listRolePageGrants(
  db: HrmsDb,
  employerId: number,
  roleId: number | null,
  filters: { page?: number | null; q?: string | null } = {},
): Promise<RoleGrantPage> {
  const tenantId = parseEmployerId(employerId);
  const paging = pageQuery(filters.page);
  if (!roleId) {
    return { rows: [], totalCount: 0, page: paging.page, pageSize: paging.pageSize };
  }
  const parsedRoleId = roleIdSchema.parse(roleId);
  const q = searchText(filters.q);
  const pattern = q == null ? null : likeContains(q);
  const nameFilter = textFilter(
    q,
    Prisma.sql`AND (
        Menu.MenuName LIKE ${pattern}
        OR CONVERT(NVARCHAR(20), RolePages.PageId) LIKE ${pattern}
    )`,
  );
  const rows = await db.$queryRaw<
    Array<{
      RoleID: number;
      RoleName: string | null;
      MenuId: number;
      MenuName: string | null;
      MasterIsActive: number | boolean | null;
      TotalCount: number | bigint | null;
    }>
  >`
    SELECT
        RolePages.RoleID,
        Roles.RoleName,
        RolePages.PageId AS MenuId,
        Menu.MenuName,
        Menu.ISActive AS MasterIsActive,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.TRolePagesMapping AS RolePages
    LEFT JOIN dbo.TRoles AS Roles
        ON Roles.RoleID = RolePages.RoleID
    LEFT JOIN dbo.tMenuDetails AS Menu
        ON Menu.MenuId = RolePages.PageId
        AND Menu.Employerid = RolePages.Employerid
    WHERE RolePages.Employerid = ${tenantId}
        AND RolePages.RoleID = ${parsedRoleId}
        ${nameFilter}
    ORDER BY Menu.MenuName, RolePages.PageId
    OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY
  `;
  return {
    rows: rows.map((row) => ({
      roleId: row.RoleID,
      roleName: row.RoleName,
      menuId: row.MenuId,
      menuName: row.MenuName,
      masterIsActive: row.MasterIsActive,
    })),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging.page,
    pageSize: paging.pageSize,
  };
}
