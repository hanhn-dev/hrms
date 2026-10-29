import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import {
  likeContains,
  LIST_PAGE_SIZE,
  pageQuery,
  searchText,
  totalCountOf,
  type PageResult,
} from "../../shared/page.ts";
import { asBool } from "./helpers";

export type WorkflowGroupMember = {
  employeeId: number;
  name: string;
  employmentNumber: string | null;
};

export type WorkflowGroupRow = {
  roleId: number;
  roleName: string;
  roleDescription: string | null;
  employerId: number | null;
  isDefault: boolean;
  isActive: boolean;
  memberCount: number;
  members: WorkflowGroupMember[];
  locationCount: number;
  businessUnitCount: number;
  referencedByWorkflowCount: number;
  isEmptyReferenced: boolean;
};

type GroupRow = {
  RoleId: number;
  RoleName: string;
  RoleDescription: string | null;
  Employerid: number | null;
  IsDefault: string | boolean | number | null;
  isactive: string | boolean | number | null;
  LocationCount: number;
  BusinessUnitCount: number;
  ReferencedByWorkflowCount: number;
  TotalCount?: number | bigint | null;
};

export type WorkflowGroupPage = PageResult<WorkflowGroupRow>;

type MemberRow = {
  Roleid: number;
  Employeeid: number;
  FullName: string | null;
  EmploymentNumber: string | null;
};

async function loadWorkflowGroups(
  db: HrmsDb,
  employerId: number,
  filters: {
    page?: number | null;
    q?: string | null;
    roleId?: number | null;
    unbounded?: boolean;
  },
): Promise<WorkflowGroupPage> {
  const tenantId = parseEmployerId(employerId);
  const paging = filters.unbounded ? null : pageQuery(filters.page);
  const q = searchText(filters.q);
  const pattern = q == null ? null : likeContains(q);
  const nameFilter =
    pattern == null
      ? Prisma.empty
      : Prisma.sql`AND (
            RoleGroup.RoleName LIKE ${pattern}
            OR RoleGroup.RoleDescription LIKE ${pattern}
        )`;
  const roleFilter =
    filters.roleId == null
      ? Prisma.empty
      : Prisma.sql`AND RoleGroup.RoleId = ${filters.roleId}`;
  const pageClause =
    paging == null
      ? Prisma.empty
      : Prisma.sql`OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY`;
  const rows = await db.$queryRaw<GroupRow[]>`
    SELECT
        RoleGroup.RoleId,
        RoleGroup.RoleName,
        RoleGroup.RoleDescription,
        RoleGroup.Employerid,
        RoleGroup.IsDefault,
        RoleGroup.isactive,
        (
            SELECT COUNT(*)
            FROM dbo.tRoleLocationMapping AS Mapping
            WHERE Mapping.Roleid = RoleGroup.RoleId
        ) AS LocationCount,
        (
            SELECT COUNT(*)
            FROM dbo.tRoleBusinessUnitMapping AS Mapping
            WHERE Mapping.Roleid = RoleGroup.RoleId
        ) AS BusinessUnitCount,
        (
            SELECT COUNT(DISTINCT Detail.WorkflowId)
            FROM dbo.TWorkflowDetails AS Detail
            INNER JOIN dbo.TWorkflowManagement AS Workflow
                ON Workflow.WorkflowId = Detail.WorkflowId
            WHERE Workflow.Employerid = ${tenantId}
                AND ISNULL(Workflow.IsDelete, 0) = 0
                AND ISNULL(Detail.IsDelete, 0) = 0
                AND (
                    Detail.ManagerId = RoleGroup.RoleId
                    OR (
                        Detail.LevelNotifications IS NOT NULL
                        AND ',' + Detail.LevelNotifications + ',' LIKE '%,' + RoleGroup.RoleName + ',%'
                    )
                    OR (
                        Detail.ApproversNotifications IS NOT NULL
                        AND ',' + Detail.ApproversNotifications + ',' LIKE '%,' + RoleGroup.RoleName + ',%'
                    )
                )
        ) AS ReferencedByWorkflowCount,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.TRoleManagement AS RoleGroup
    WHERE ISNULL(RoleGroup.IsDelete, 0) = 0
        AND (
            RoleGroup.Employerid = ${tenantId}
            OR (RoleGroup.Employerid = 0 AND RoleGroup.IsDefault = 'Y')
        )
        ${nameFilter}
        ${roleFilter}
    ORDER BY RoleGroup.IsDefault DESC, RoleGroup.RoleName, RoleGroup.RoleId
    ${pageClause}
  `;
  const unique = new Map<number, WorkflowGroupRow>();
  for (const row of rows) {
    if (unique.has(row.RoleId)) {
      continue;
    }
    const referencedByWorkflowCount = Number(row.ReferencedByWorkflowCount);
    unique.set(row.RoleId, {
      roleId: row.RoleId,
      roleName: row.RoleName,
      roleDescription: row.RoleDescription,
      employerId: row.Employerid,
      isDefault: asBool(row.IsDefault) || row.IsDefault === "Y",
      isActive: row.isactive === "Y" || asBool(row.isactive),
      memberCount: 0,
      members: [],
      locationCount: Number(row.LocationCount),
      businessUnitCount: Number(row.BusinessUnitCount),
      referencedByWorkflowCount,
      isEmptyReferenced: referencedByWorkflowCount > 0,
    });
  }

  const roleIds = [...unique.keys()];
  if (roleIds.length > 0) {
    const memberRows = await db.$queryRaw<MemberRow[]>`
      SELECT
          Mapping.Roleid,
          Mapping.Employeeid,
          LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
          EmployeeInfo.EmploymentNumber
      FROM dbo.tRoleEmployeeMapping AS Mapping
      INNER JOIN dbo.TEmployee AS Employee
          ON Employee.EmployeeId = Mapping.Employeeid
      LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
          ON EmployeeInfo.EmployeeId = Employee.EmployeeId
      WHERE Mapping.Roleid IN (${Prisma.join(roleIds)})
      ORDER BY FullName, Mapping.Employeeid
    `;
    for (const member of memberRows) {
      const group = unique.get(member.Roleid);
      if (!group) {
        continue;
      }
      group.members.push({
        employeeId: member.Employeeid,
        name: member.FullName?.trim() || `Employee ${member.Employeeid}`,
        employmentNumber: member.EmploymentNumber,
      });
    }
  }

  for (const group of unique.values()) {
    group.memberCount = group.members.length;
    group.isEmptyReferenced = group.referencedByWorkflowCount > 0 && group.memberCount === 0;
  }

  const listed = [...unique.values()];
  return {
    rows: listed,
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging?.page ?? 1,
    pageSize: paging?.pageSize ?? Math.max(listed.length, 1),
  };
}

export async function listWorkflowGroups(
  db: HrmsDb,
  employerId: number,
  filters: { page?: number | null; q?: string | null; roleId?: number | null } = {},
): Promise<WorkflowGroupPage> {
  return loadWorkflowGroups(db, employerId, filters);
}

/** Approver-group options on one workflow. Not the catalog page. */
export async function listWorkflowActorGroups(
  db: HrmsDb,
  employerId: number,
): Promise<WorkflowGroupRow[]> {
  const loaded = await loadWorkflowGroups(db, employerId, { unbounded: true });
  return loaded.rows;
}

export type WorkflowScopeOption = {
  id: number;
  name: string;
};

function scopeNameFilter(
  q: string | null,
  column: Prisma.Sql,
): Prisma.Sql {
  if (q == null) {
    return Prisma.empty;
  }
  return Prisma.sql`AND ${column} LIKE ${likeContains(q)}`;
}

function includeIdFilter(
  includeIds: readonly number[] | undefined,
  column: Prisma.Sql,
): Prisma.Sql {
  if (includeIds == null || includeIds.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`OR ${column} IN (${Prisma.join(includeIds)})`;
}

export async function listWorkflowLocations(
  db: HrmsDb,
  employerId: number,
  filters: { q?: string | null; includeIds?: readonly number[] } = {},
): Promise<WorkflowScopeOption[]> {
  const tenantId = parseEmployerId(employerId);
  const q = searchText(filters.q);
  const rows = await db.$queryRaw<
    Array<{ LocationID: number; LocationName: string }>
  >`
    SELECT Location.LocationID, Location.LocationName
    FROM dbo.TLocation AS Location
    WHERE Location.Employerid = ${tenantId}
        AND Location.IsActive = 1
        AND (
            Location.LocationID IN (
                SELECT TOP (${Prisma.raw(String(LIST_PAGE_SIZE))})
                    InnerLocation.LocationID
                FROM dbo.TLocation AS InnerLocation
                WHERE InnerLocation.Employerid = ${tenantId}
                    AND InnerLocation.IsActive = 1
                    ${scopeNameFilter(q, Prisma.sql`InnerLocation.LocationName`)}
                ORDER BY InnerLocation.LocationName, InnerLocation.LocationID
            )
            ${includeIdFilter(filters.includeIds, Prisma.sql`Location.LocationID`)}
        )
    ORDER BY Location.LocationName, Location.LocationID
  `;
  return rows.map((row) => ({
    id: row.LocationID,
    name: row.LocationName,
  }));
}

export async function listWorkflowBusinessUnits(
  db: HrmsDb,
  employerId: number,
  filters: { q?: string | null; includeIds?: readonly number[] } = {},
): Promise<WorkflowScopeOption[]> {
  const tenantId = parseEmployerId(employerId);
  const q = searchText(filters.q);
  const rows = await db.$queryRaw<Array<{ UnitID: number; UnitName: string }>>`
    SELECT BusinessUnit.UnitID, BusinessUnit.UnitName
    FROM dbo.TOrgHierarchyDetails AS BusinessUnit
    WHERE BusinessUnit.Employerid = ${tenantId}
        AND BusinessUnit.isactive = 'Y'
        AND BusinessUnit.isdelete = 'N'
        AND (
            BusinessUnit.UnitID IN (
                SELECT TOP (${Prisma.raw(String(LIST_PAGE_SIZE))})
                    InnerUnit.UnitID
                FROM dbo.TOrgHierarchyDetails AS InnerUnit
                WHERE InnerUnit.Employerid = ${tenantId}
                    AND InnerUnit.isactive = 'Y'
                    AND InnerUnit.isdelete = 'N'
                    ${scopeNameFilter(q, Prisma.sql`InnerUnit.UnitName`)}
                ORDER BY InnerUnit.UnitName, InnerUnit.UnitID
            )
            ${includeIdFilter(filters.includeIds, Prisma.sql`BusinessUnit.UnitID`)}
        )
    ORDER BY BusinessUnit.UnitName, BusinessUnit.UnitID
  `;
  return rows.map((row) => ({
    id: row.UnitID,
    name: row.UnitName,
  }));
}
