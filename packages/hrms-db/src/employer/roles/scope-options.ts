import type { HrmsDb } from "../../shared/client.ts";
import { parseEmployerId } from "../../shared/ids.ts";
import type {
  EmployerBusinessUnitOption,
  EmployerLocationOption,
} from "./org-unit-tree.ts";

export type {
  EmployerBusinessUnitOption,
  EmployerLocationOption,
  OrgUnitTreeNode,
} from "./org-unit-tree.ts";

export {
  buildOrgUnitTree,
  collectOrgUnitIds,
  withMissingBusinessUnitOptions,
  withMissingLocationOptions,
} from "./org-unit-tree.ts";

export async function listEmployerLocations(
  db: HrmsDb,
  employerId: number,
): Promise<EmployerLocationOption[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<
    Array<{
      LocationId: number;
      LocationName: string | null;
      IsActive: boolean | number | null;
    }>
  >`
    SELECT
        Location.LocationId,
        Location.LocationName,
        Location.IsActive
    FROM dbo.TLocation AS Location
    WHERE Location.Employerid = ${tenantId}
    ORDER BY
        CASE WHEN Location.IsActive = 1 THEN 0 ELSE 1 END,
        Location.LocationName
  `;
  return rows.map((row) => ({
    locationId: row.LocationId,
    locationName: row.LocationName?.trim() || `Location ${row.LocationId}`,
    isActive: row.IsActive === true || row.IsActive === 1,
  }));
}

export async function listEmployerBusinessUnits(
  db: HrmsDb,
  employerId: number,
): Promise<EmployerBusinessUnitOption[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<
    Array<{
      UnitID: number;
      UnitName: string | null;
      ParentUnitid: number | null;
      isactive: string | null;
    }>
  >`
    SELECT
        BusinessUnit.UnitID,
        BusinessUnit.UnitName,
        BusinessUnit.ParentUnitid,
        BusinessUnit.isactive
    FROM dbo.TOrgHierarchyDetails AS BusinessUnit
    WHERE BusinessUnit.Employerid = ${tenantId}
        AND ISNULL(BusinessUnit.isdelete, 'N') = 'N'
        AND BusinessUnit.UnitID IS NOT NULL
    ORDER BY
        CASE WHEN BusinessUnit.isactive = 'Y' THEN 0 ELSE 1 END,
        BusinessUnit.UnitName
  `;
  return rows.map((row) => ({
    unitId: row.UnitID,
    unitName: row.UnitName?.trim() || `Unit ${row.UnitID}`,
    parentUnitId: row.ParentUnitid,
    isActive: row.isactive === "Y",
  }));
}
