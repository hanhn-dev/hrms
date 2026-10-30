import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { userIdSchema } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import {
  likeContains,
  pageQuery,
  searchText,
  totalCountOf,
  type PageResult,
} from "../../shared/page.ts";
import {
  buildMenuTree,
  classifyMenuXml,
  collectMenuIds,
  hierarchyFromXmlNodes,
  menuIdMismatches,
  parseMenuXml,
  resolveArmSource,
  type ArmSourceKind,
  type MenuNode,
  type MenuRow,
  type MenuXmlHealth,
  type ModuleMapping,
} from "./tree.ts";

const menuEmployerIdSchema = z.number().int().nonnegative();

export function parseMenuEmployerId(value: number): number {
  return menuEmployerIdSchema.parse(value);
}

export function parseAuditUserId(value: number): number {
  return userIdSchema.parse(value);
}

export type MenuHistorySnapshot = {
  snapshotKey: string;
  historyCreatedAt: string | null;
  actionType: string | null;
  xmlBytes: number;
  health: MenuXmlHealth;
};

export type MenuIdRef = {
  menuId: number;
  menuName: string | null;
};

export type MenuDiagnosis = {
  employerId: number;
  employerName: string | null;
  parentEmployerId: number | null;
  rootEmployerId: number | null;
  source: ArmSourceKind;
  sourceEmployerId: number;
  health: MenuXmlHealth;
  xmlBytes: number;
  ownXmlRowCount: number;
  inherited: boolean;
  inXmlMissingFromHierarchy: MenuIdRef[];
  inHierarchyMissingFromXml: MenuIdRef[];
  history: MenuHistorySnapshot[];
};

export type EmployerMenu = {
  employerId: number;
  inherited: boolean;
  sourceEmployerId: number;
  nodes: MenuNode[];
};

export type TemplateMenuRow = {
  menuId: number;
  menuName: string | null;
  navigateUrl: string | null;
  pageName: string | null;
};

export type CopyTargetRow = {
  employerId: number;
  employerName: string | null;
};

type XmlRow = {
  employerid: number;
  XmlBytes: number | bigint | null;
  DynamicMenuXML: string | null;
};

type MenuSqlRow = {
  MenuId: number;
  MenuName: string | null;
  NavigateURL: string | null;
  PageName: string | null;
  ISActive: boolean | number | null;
  iconname: string | null;
  ParentMenuId: number | null;
  parentseq: number | null;
};

export async function getMenuDiagnosis(db: HrmsDb, employerId: number): Promise<MenuDiagnosis> {
  const tenantId = parseMenuEmployerId(employerId);
  const employer = await loadEmployer(db, tenantId);
  const parentEmployerId = employer?.parentEmployerId ?? null;
  const xmlEmployerIds = uniqueIds([tenantId, parentEmployerId, 0]);
  const xmlRows = await loadXmlRows(db, xmlEmployerIds);
  const own = xmlRows.find((row) => row.employerid === tenantId);
  const parent =
    parentEmployerId == null
      ? undefined
      : xmlRows.find((row) => row.employerid === parentEmployerId);
  const source = resolveArmSource({
    employerId: tenantId,
    parentEmployerId,
    ownRowCount: own ? 1 : 0,
    parentRowCount: parent ? 1 : 0,
  });
  const sourceXml = xmlRows.find((row) => row.employerid === source.sourceEmployerId);
  const xml = sourceXml?.DynamicMenuXML ?? null;
  const health = classifyMenuXml(xml);
  const hierarchyIds = await loadHierarchyIds(db, tenantId);
  const xmlIds = xmlIdsOf(xml);
  const mismatches = menuIdMismatches(xmlIds, hierarchyIds);
  const names = await loadMenuNames(db, [
    ...mismatches.inXmlMissingFromHierarchy,
    ...mismatches.inHierarchyMissingFromXml,
  ]);
  const ownMenuCount = await countMenuRows(db, tenantId);

  return {
    employerId: tenantId,
    employerName: tenantId === 0 ? "Template" : (employer?.employerName ?? null),
    parentEmployerId,
    rootEmployerId: employer?.rootEmployerId ?? null,
    source: source.source,
    sourceEmployerId: source.sourceEmployerId,
    health,
    xmlBytes: Number(sourceXml?.XmlBytes ?? 0),
    ownXmlRowCount: own ? 1 : 0,
    inherited: ownMenuCount === 0 && source.sourceEmployerId !== tenantId,
    inXmlMissingFromHierarchy: mismatches.inXmlMissingFromHierarchy.map((menuId) => ({
      menuId,
      menuName: names.get(menuId) ?? null,
    })),
    inHierarchyMissingFromXml: mismatches.inHierarchyMissingFromXml.map((menuId) => ({
      menuId,
      menuName: names.get(menuId) ?? null,
    })),
    history: await loadHistory(db, tenantId),
  };
}

export async function getEmployerMenu(db: HrmsDb, employerId: number): Promise<EmployerMenu> {
  const tenantId = parseMenuEmployerId(employerId);
  const ownRows = await loadMenuRows(db, tenantId);
  if (ownRows.length > 0 || tenantId === 0) {
    return {
      employerId: tenantId,
      inherited: false,
      sourceEmployerId: tenantId,
      nodes: buildMenuTree(ownRows),
    };
  }

  const diagnosis = await getMenuDiagnosis(db, tenantId);
  const sourceId = diagnosis.sourceEmployerId;
  const sourceRows = sourceId === tenantId ? ownRows : await loadMenuRows(db, sourceId);
  return {
    employerId: tenantId,
    inherited: sourceRows.length > 0,
    sourceEmployerId: sourceId,
    nodes: buildMenuTree(sourceRows),
  };
}

export async function listTemplateMenus(
  db: HrmsDb,
  employerId: number,
  filters: { page?: number | null; pageSize?: number | null; q?: string | null } = {},
): Promise<PageResult<TemplateMenuRow>> {
  const tenantId = parseMenuEmployerId(employerId);
  const paging = pageQuery(filters.page, filters.pageSize);
  const q = searchText(filters.q);
  const pattern = q == null ? null : likeContains(q);
  const nameFilter =
    q == null
      ? Prisma.empty
      : Prisma.sql`AND (
          Menu.MenuName LIKE ${pattern}
          OR Menu.PageName LIKE ${pattern}
          OR CONVERT(NVARCHAR(20), Menu.MenuId) LIKE ${pattern}
        )`;
  const rows = await db.$queryRaw<
    Array<{
      MenuId: number;
      MenuName: string | null;
      NavigateURL: string | null;
      PageName: string | null;
      TotalCount: number | bigint | null;
    }>
  >`
    SELECT
        Menu.MenuId,
        Menu.MenuName,
        Menu.NavigateURL,
        Menu.PageName,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.Employerid = 0
        AND Menu.MenuId > 1
        AND NOT EXISTS (
            SELECT 1
            FROM dbo.tMenuDetails AS Existing
            WHERE Existing.Employerid = ${tenantId}
                AND Existing.MenuId = Menu.MenuId
        )
        ${nameFilter}
    ORDER BY Menu.MenuName ASC, Menu.MenuId ASC
    OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY
  `;
  return {
    rows: rows.map((row) => ({
      menuId: row.MenuId,
      menuName: row.MenuName,
      navigateUrl: row.NavigateURL,
      pageName: row.PageName,
    })),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging.page,
    pageSize: paging.pageSize,
  };
}

export async function listCopyTargets(
  db: HrmsDb,
  filters: { page?: number | null; pageSize?: number | null; q?: string | null } = {},
): Promise<PageResult<CopyTargetRow>> {
  const paging = pageQuery(filters.page, filters.pageSize);
  const q = searchText(filters.q);
  const pattern = q == null ? null : likeContains(q);
  const nameFilter =
    q == null
      ? Prisma.empty
      : Prisma.sql`AND (
          Employer.EmployerName LIKE ${pattern}
          OR CONVERT(NVARCHAR(20), Employer.Employerid) LIKE ${pattern}
        )`;
  const rows = await db.$queryRaw<
    Array<{
      Employerid: number;
      EmployerName: string | null;
      TotalCount: number | bigint | null;
    }>
  >`
    SELECT
        Employer.Employerid,
        Employer.EmployerName,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.TEmployerDetails AS Employer
    WHERE Employer.IsActive = 1
        AND Employer.Employerid > 0
        ${nameFilter}
    ORDER BY Employer.EmployerName ASC, Employer.Employerid ASC
    OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY
  `;
  return {
    rows: rows.map((row) => ({
      employerId: row.Employerid,
      employerName: row.EmployerName,
    })),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging.page,
    pageSize: paging.pageSize,
  };
}

export async function loadMenuRows(db: HrmsDb, employerId: number): Promise<MenuRow[]> {
  const tenantId = parseMenuEmployerId(employerId);
  const rows = await db.$queryRaw<MenuSqlRow[]>`
    SELECT
        Menu.MenuId,
        Menu.MenuName,
        Menu.NavigateURL,
        Menu.PageName,
        Menu.ISActive,
        Menu.iconname,
        Hierarchy.ParentMenuId,
        Hierarchy.parentseq
    FROM dbo.tMenuDetails AS Menu
    LEFT JOIN dbo.TMenuHierarchy AS Hierarchy
        ON Hierarchy.MenuId = Menu.MenuId
        AND Hierarchy.Employerid = Menu.Employerid
    WHERE Menu.Employerid = ${tenantId}
        AND Menu.MenuId > 1
  `;
  return rows.map((row) => ({
    menuId: row.MenuId,
    menuName: row.MenuName?.trim() || `Menu ${row.MenuId}`,
    parentMenuId: row.ParentMenuId,
    parentSeq: row.parentseq == null ? Number.MAX_SAFE_INTEGER : Number(row.parentseq),
    isActive: row.ISActive === true || row.ISActive === 1,
    navigateUrl: row.NavigateURL,
    pageName: row.PageName,
    iconName: row.iconname,
  }));
}

export async function loadModuleMappings(db: HrmsDb): Promise<Map<number, ModuleMapping>> {
  const rows = await db.$queryRaw<
    Array<{ MenuId: number; ModuleId: number | null; IsDefault: boolean | number | null }>
  >`
    SELECT MenuId, ModuleId, IsDefault
    FROM dbo.TModuleMenuMapping
    WHERE MenuId IS NOT NULL
  `;
  const mappings = new Map<number, ModuleMapping>();
  for (const row of rows) {
    mappings.set(row.MenuId, {
      menuId: row.MenuId,
      moduleId: row.ModuleId,
      isDefault: row.IsDefault === true || row.IsDefault === 1,
    });
  }
  return mappings;
}

export async function loadLicensedModuleIds(db: HrmsDb, employerId: number): Promise<Set<number>> {
  const tenantId = parseMenuEmployerId(employerId);
  if (tenantId === 0) {
    const rows = await db.$queryRaw<Array<{ ModuleId: number }>>`
      SELECT DISTINCT Module.ModuleId
      FROM dbo.THrmsModules AS Module
      WHERE Module.IsActive = 1
    `;
    return new Set(rows.map((row) => row.ModuleId));
  }
  const rows = await db.$queryRaw<Array<{ ModuleId: number }>>`
    SELECT DISTINCT Module.ModuleId
    FROM dbo.THrmsModules AS Module
    INNER JOIN dbo.TEmployerModule AS EmployerModule
        ON EmployerModule.HrmsModuleID = Module.ModuleId
    INNER JOIN dbo.TEmployerDetails AS Employer
        ON Employer.Employerid = ${tenantId}
    WHERE Module.IsActive = 1
        AND EmployerModule.IsActive = 1
        AND EmployerModule.EmployerId = ISNULL(Employer.RootEmployerId, ${tenantId})
  `;
  return new Set(rows.map((row) => row.ModuleId));
}

export async function loadTemplateMenuNodes(db: HrmsDb): Promise<MenuNode[]> {
  const rows = await loadMenuRows(db, 0);
  if (rows.length > 0) {
    return buildMenuTree(rows);
  }
  const xmlRows = await loadXmlRows(db, [0]);
  const xml = xmlRows[0]?.DynamicMenuXML;
  if (!xml) {
    return [];
  }
  return buildMenuTree(rowsFromXml(xml));
}

async function loadEmployer(
  db: HrmsDb,
  employerId: number,
): Promise<{
  employerName: string | null;
  parentEmployerId: number | null;
  rootEmployerId: number | null;
} | null> {
  if (employerId === 0) {
    return { employerName: "Template", parentEmployerId: null, rootEmployerId: 0 };
  }
  const rows = await db.$queryRaw<
    Array<{
      EmployerName: string | null;
      ParentEmployerid: number | null;
      RootEmployerId: number | null;
    }>
  >`
    SELECT TOP (1)
        Employer.EmployerName,
        Employer.ParentEmployerid,
        Employer.RootEmployerId
    FROM dbo.TEmployerDetails AS Employer
    WHERE Employer.Employerid = ${employerId}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    employerName: row.EmployerName,
    parentEmployerId: row.ParentEmployerid,
    rootEmployerId: row.RootEmployerId,
  };
}

async function loadXmlRows(db: HrmsDb, employerIds: number[]): Promise<XmlRow[]> {
  if (employerIds.length === 0) {
    return [];
  }
  return db.$queryRaw<XmlRow[]>`
    SELECT
        Hierarchy.employerid,
        DATALENGTH(Hierarchy.DynamicMenuXML) AS XmlBytes,
        Hierarchy.DynamicMenuXML
    FROM dbo.TDynamicMenuHierarchy AS Hierarchy
    WHERE Hierarchy.employerid IN (${Prisma.join(employerIds)})
  `;
}

async function loadHierarchyIds(db: HrmsDb, employerId: number): Promise<number[]> {
  const rows = await db.$queryRaw<Array<{ MenuId: number }>>`
    SELECT Hierarchy.MenuId
    FROM dbo.TMenuHierarchy AS Hierarchy
    WHERE Hierarchy.Employerid = ${employerId}
        AND Hierarchy.MenuId IS NOT NULL
  `;
  return rows.map((row) => row.MenuId);
}

async function countMenuRows(db: HrmsDb, employerId: number): Promise<number> {
  const rows = await db.$queryRaw<Array<{ MenuCount: number | bigint }>>`
    SELECT COUNT(*) AS MenuCount
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.Employerid = ${employerId}
        AND Menu.MenuId > 1
  `;
  return Number(rows[0]?.MenuCount ?? 0);
}

async function loadMenuNames(db: HrmsDb, menuIds: number[]): Promise<Map<number, string | null>> {
  const unique = [...new Set(menuIds)].slice(0, 200);
  const names = new Map<number, string | null>();
  if (unique.length === 0) {
    return names;
  }
  const rows = await db.$queryRaw<Array<{ MenuId: number; MenuName: string | null }>>`
    SELECT Menu.MenuId, Menu.MenuName
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.Employerid = 0
        AND Menu.MenuId IN (${Prisma.join(unique)})
  `;
  for (const row of rows) {
    names.set(row.MenuId, row.MenuName);
  }
  return names;
}

async function loadHistory(db: HrmsDb, employerId: number): Promise<MenuHistorySnapshot[]> {
  const rows = await db.$queryRaw<
    Array<{
      SnapshotKey: string;
      HistoryCreatedAt: string | null;
      ActionType: string | null;
      XmlBytes: number | bigint | null;
      DynamicMenuXML: string | null;
    }>
  >`
    SELECT TOP (20)
        CONCAT(
            ISNULL(CONVERT(VARCHAR(23), History.HistoryCreatedDate, 121), ''),
            '|',
            ISNULL(History.ActionType, ''),
            '|',
            CONVERT(VARCHAR(20), ISNULL(DATALENGTH(History.DynamicMenuXML), 0)),
            '|',
            CONVERT(VARCHAR(20), ISNULL(History.Transid, 0))
        ) AS SnapshotKey,
        CONVERT(VARCHAR(23), History.HistoryCreatedDate, 121) AS HistoryCreatedAt,
        History.ActionType,
        DATALENGTH(History.DynamicMenuXML) AS XmlBytes,
        History.DynamicMenuXML
    FROM dbo.TDynamicMenuHierarchyHistory AS History
    WHERE History.employerid = ${employerId}
    ORDER BY History.HistoryCreatedDate DESC, History.Transid DESC
  `;
  return rows.map((row) => ({
    snapshotKey: row.SnapshotKey,
    historyCreatedAt: row.HistoryCreatedAt ? asIso(row.HistoryCreatedAt) : null,
    actionType: row.ActionType,
    xmlBytes: Number(row.XmlBytes ?? 0),
    health: classifyMenuXml(row.DynamicMenuXML),
  }));
}

function xmlIdsOf(xml: string | null): number[] {
  if (!xml || classifyMenuXml(xml) === "blank") {
    return [];
  }
  try {
    return collectMenuIds(parseMenuXml(xml));
  } catch {
    return [];
  }
}

function rowsFromXml(xml: string): MenuRow[] {
  const nodes = parseMenuXml(xml);
  const names = new Map<number, string>();
  const walk = (items: typeof nodes): void => {
    for (const item of items) {
      names.set(item.menuId, item.menuName);
      walk(item.children);
    }
  };
  walk(nodes);
  return hierarchyFromXmlNodes(nodes)
    .filter((item) => item.menuId > 1)
    .map((item) => ({
      menuId: item.menuId,
      menuName: names.get(item.menuId)?.trim() || `Menu ${item.menuId}`,
      parentMenuId: item.parentMenuId === 1 ? null : item.parentMenuId,
      parentSeq: item.parentSeq,
      isActive: true,
      navigateUrl: null,
      pageName: null,
      iconName: null,
    }));
}

function uniqueIds(ids: Array<number | null>): number[] {
  return [...new Set(ids.filter((id): id is number => id != null))];
}
