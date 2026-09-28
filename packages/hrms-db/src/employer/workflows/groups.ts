import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { asBool } from "./helpers";

export type WorkflowGroupRow = {
  roleId: number;
  roleName: string;
  roleDescription: string | null;
  employerId: number | null;
  isDefault: boolean;
  isActive: boolean;
  memberCount: number;
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
  MemberCount: number;
  LocationCount: number;
  BusinessUnitCount: number;
  ReferencedByWorkflowCount: number;
};

export async function listWorkflowGroups(
  db: HrmsDb,
  employerId: number,
): Promise<WorkflowGroupRow[]> {
  const tenantId = parseEmployerId(employerId);
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
            FROM dbo.tRoleEmployeeMapping AS Mapping
            WHERE Mapping.Roleid = RoleGroup.RoleId
        ) AS MemberCount,
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
        ) AS ReferencedByWorkflowCount
    FROM dbo.TRoleManagement AS RoleGroup
    WHERE ISNULL(RoleGroup.IsDelete, 0) = 0
        AND (
            RoleGroup.Employerid = ${tenantId}
            OR (RoleGroup.Employerid = 0 AND RoleGroup.IsDefault = 'Y')
        )
    ORDER BY RoleGroup.IsDefault DESC, RoleGroup.RoleName
  `;
  const unique = new Map<number, WorkflowGroupRow>();
  for (const row of rows) {
    if (unique.has(row.RoleId)) {
      continue;
    }
    const memberCount = Number(row.MemberCount);
    const referencedByWorkflowCount = Number(row.ReferencedByWorkflowCount);
    unique.set(row.RoleId, {
      roleId: row.RoleId,
      roleName: row.RoleName,
      roleDescription: row.RoleDescription,
      employerId: row.Employerid,
      isDefault: asBool(row.IsDefault) || row.IsDefault === "Y",
      isActive: row.isactive === "Y" || asBool(row.isactive),
      memberCount,
      locationCount: Number(row.LocationCount),
      businessUnitCount: Number(row.BusinessUnitCount),
      referencedByWorkflowCount,
      isEmptyReferenced: referencedByWorkflowCount > 0 && memberCount === 0,
    });
  }
  return [...unique.values()];
}

export type WorkflowScopeOption = {
  id: number;
  name: string;
};

export async function listWorkflowLocations(
  db: HrmsDb,
  employerId: number,
): Promise<WorkflowScopeOption[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<
    Array<{ LocationID: number; LocationName: string }>
  >`
    SELECT Location.LocationID, Location.LocationName
    FROM dbo.TLocation AS Location
    WHERE Location.Employerid = ${tenantId}
        AND Location.IsActive = 1
    ORDER BY Location.LocationName
  `;
  return rows.map((row) => ({
    id: row.LocationID,
    name: row.LocationName,
  }));
}

export async function listWorkflowBusinessUnits(
  db: HrmsDb,
  employerId: number,
): Promise<WorkflowScopeOption[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<Array<{ UnitID: number; UnitName: string }>>`
    SELECT BusinessUnit.UnitID, BusinessUnit.UnitName
    FROM dbo.TOrgHierarchyDetails AS BusinessUnit
    WHERE BusinessUnit.Employerid = ${tenantId}
        AND BusinessUnit.isactive = 'Y'
        AND BusinessUnit.isdelete = 'N'
    ORDER BY BusinessUnit.UnitName
  `;
  return rows.map((row) => ({
    id: row.UnitID,
    name: row.UnitName,
  }));
}
