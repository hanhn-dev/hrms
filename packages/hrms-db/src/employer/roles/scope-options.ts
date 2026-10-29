import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client.ts";
import { parseEmployerId } from "../../shared/ids.ts";
import { likeContains, LIST_PAGE_SIZE, searchText } from "../../shared/page.ts";
import type {
  EmployerBusinessUnitOption,
  EmployerLocationOption,
} from "./org-unit-tree.ts";

type ScopeFilters = {
  q?: string | null;
  includeIds?: readonly number[];
  /** Select-all. Skips the first-50 bound. */
  all?: boolean;
};

function nameLike(q: string | null, column: Prisma.Sql): Prisma.Sql {
  if (q == null) {
    return Prisma.empty;
  }
  return Prisma.sql`AND ${column} LIKE ${likeContains(q)}`;
}

function includeIdsSql(
  includeIds: readonly number[] | undefined,
  column: Prisma.Sql,
): Prisma.Sql {
  if (includeIds == null || includeIds.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`OR ${column} IN (${Prisma.join(includeIds)})`;
}

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
  filters: ScopeFilters = {},
): Promise<EmployerLocationOption[]> {
  const tenantId = parseEmployerId(employerId);
  const q = searchText(filters.q);
  const bound = filters.all
    ? Prisma.empty
    : Prisma.sql`AND (
            Location.LocationId IN (
                SELECT TOP (${Prisma.raw(String(LIST_PAGE_SIZE))})
                    InnerLocation.LocationId
                FROM dbo.TLocation AS InnerLocation
                WHERE InnerLocation.Employerid = ${tenantId}
                    ${nameLike(q, Prisma.sql`InnerLocation.LocationName`)}
                ORDER BY
                    CASE WHEN InnerLocation.IsActive = 1 THEN 0 ELSE 1 END,
                    InnerLocation.LocationName,
                    InnerLocation.LocationId
            )
            ${includeIdsSql(filters.includeIds, Prisma.sql`Location.LocationId`)}
        )`;
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
        ${bound}
    ORDER BY
        CASE WHEN Location.IsActive = 1 THEN 0 ELSE 1 END,
        Location.LocationName,
        Location.LocationId
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
  filters: ScopeFilters = {},
): Promise<EmployerBusinessUnitOption[]> {
  const tenantId = parseEmployerId(employerId);
  const q = searchText(filters.q);
  const rows = filters.all
    ? await db.$queryRaw<
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
            ${nameLike(q, Prisma.sql`BusinessUnit.UnitName`)}
        ORDER BY
            CASE WHEN BusinessUnit.isactive = 'Y' THEN 0 ELSE 1 END,
            BusinessUnit.UnitName,
            BusinessUnit.UnitID
      `
    : await db.$queryRaw<
        Array<{
          UnitID: number;
          UnitName: string | null;
          ParentUnitid: number | null;
          isactive: string | null;
        }>
      >`
        WITH Ranked AS (
            SELECT TOP (${Prisma.raw(String(LIST_PAGE_SIZE))})
                InnerUnit.UnitID
            FROM dbo.TOrgHierarchyDetails AS InnerUnit
            WHERE InnerUnit.Employerid = ${tenantId}
                AND ISNULL(InnerUnit.isdelete, 'N') = 'N'
                AND InnerUnit.UnitID IS NOT NULL
                ${nameLike(q, Prisma.sql`InnerUnit.UnitName`)}
            ORDER BY
                CASE WHEN InnerUnit.isactive = 'Y' THEN 0 ELSE 1 END,
                InnerUnit.UnitName,
                InnerUnit.UnitID
        ),
        Seeds AS (
            SELECT Ranked.UnitID
            FROM Ranked
            ${
              filters.includeIds == null || filters.includeIds.length === 0
                ? Prisma.empty
                : Prisma.sql`
            UNION
            SELECT BusinessUnit.UnitID
            FROM dbo.TOrgHierarchyDetails AS BusinessUnit
            WHERE BusinessUnit.Employerid = ${tenantId}
                AND BusinessUnit.UnitID IN (${Prisma.join(filters.includeIds)})
                `
            }
        ),
        Tree AS (
            SELECT
                BusinessUnit.UnitID,
                BusinessUnit.UnitName,
                BusinessUnit.ParentUnitid,
                BusinessUnit.isactive
            FROM dbo.TOrgHierarchyDetails AS BusinessUnit
            INNER JOIN Seeds
                ON Seeds.UnitID = BusinessUnit.UnitID
            UNION ALL
            SELECT
                Parent.UnitID,
                Parent.UnitName,
                Parent.ParentUnitid,
                Parent.isactive
            FROM dbo.TOrgHierarchyDetails AS Parent
            INNER JOIN Tree
                ON Tree.ParentUnitid = Parent.UnitID
            WHERE Parent.Employerid = ${tenantId}
                AND Parent.UnitID <> Tree.UnitID
                AND ISNULL(Parent.isdelete, 'N') = 'N'
        )
        SELECT DISTINCT
            Tree.UnitID,
            Tree.UnitName,
            Tree.ParentUnitid,
            Tree.isactive
        FROM Tree
      `;
  return rows.map((row) => ({
    unitId: row.UnitID,
    unitName: row.UnitName?.trim() || `Unit ${row.UnitID}`,
    parentUnitId: row.ParentUnitid,
    isActive: row.isactive === "Y",
  }));
}
