import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import {
  buildMenuTree,
  classifyMenuXml,
  filterMenuTreeByModules,
  hierarchyFromTree,
  hierarchyFromXml,
  incompleteModuleLinks,
  menuTreeToXml,
  treeFromFlat,
  validateMenuEdits,
  type DroppedMenu,
  type FlatMenuEdit,
  type HierarchyItem,
  type MenuNode,
} from "./tree.ts";
import {
  loadLicensedModuleIds,
  loadMenuRows,
  loadModuleMappings,
  loadTemplateMenuNodes,
  parseAuditUserId,
  parseMenuEmployerId,
} from "./read.ts";

type Tx = Parameters<Parameters<HrmsDb["$transaction"]>[0]>[0];

const COPY_LIMIT = 25;

export type SaveEmployerMenuResult = {
  menuCount: number;
  materialized: boolean;
};

export type RestoreMenuResult = {
  menuCount: number;
  detailCount: number;
};

export type CopyEmployerPreview = {
  employerId: number;
  employerName: string | null;
  keptCount: number;
  droppedCount: number;
  dropped: DroppedMenu[];
  skippedReason: string | null;
};

export type CopyTemplateResult = {
  updated: number[];
  skipped: Array<{ employerId: number; reason: string }>;
  failed: Array<{ employerId: number; reason: string }>;
};

export async function saveEmployerMenu(
  db: HrmsDb,
  input: { employerId: number; nodes: FlatMenuEdit[]; updatedBy: number },
): Promise<SaveEmployerMenuResult> {
  const employerId = parseMenuEmployerId(input.employerId);
  const updatedBy = parseAuditUserId(input.updatedBy);
  validateMenuEdits(input.nodes);
  if (input.nodes.length === 0) {
    throw new Error("Refusing to save an empty menu.");
  }
  const tree = treeFromFlat(input.nodes);
  const current = await loadMenuRows(db, employerId);
  const currentIds = new Set(current.map((row) => row.menuId));
  const proposedIds = input.nodes.map((row) => row.menuId);
  const added = proposedIds.filter((menuId) => !currentIds.has(menuId));
  await assertTemplateMenus(db, added);

  await db.$transaction(async (tx) => {
    await snapshotEmployerMenu(tx, employerId, updatedBy, "D", new Date());
    await deleteMenus(tx, employerId, [...currentIds].filter((menuId) => !proposedIds.includes(menuId)));
    for (const row of input.nodes) {
      if (currentIds.has(row.menuId)) {
        await tx.$executeRaw`
          UPDATE dbo.tMenuDetails
          SET MenuName = ${row.menuName.trim()},
              ISActive = ${row.isActive ? 1 : 0}
          WHERE Employerid = ${employerId}
              AND MenuId = ${row.menuId}
        `;
      } else {
        await tx.$executeRaw`
          INSERT INTO dbo.tMenuDetails (
              MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname
          )
          SELECT
              Template.MenuId,
              ${row.menuName.trim()},
              Template.NavigateURL,
              Template.PageName,
              ${row.isActive ? 1 : 0},
              ${employerId},
              ${updatedBy},
              GETDATE(),
              Template.iconname
          FROM dbo.tMenuDetails AS Template
          WHERE Template.Employerid = 0
              AND Template.MenuId = ${row.menuId}
        `;
      }
    }
    await replaceHierarchy(tx, employerId, hierarchyFromTree(tree), updatedBy);
    await upsertMenuXml(tx, employerId, menuTreeToXml(tree), updatedBy);
    await snapshotEmployerMenu(tx, employerId, updatedBy, "I", new Date());
  });

  return {
    menuCount: input.nodes.length,
    materialized: current.length === 0 && employerId !== 0,
  };
}

export async function rebuildMenuXml(
  db: HrmsDb,
  input: { employerId: number; updatedBy: number },
): Promise<{ menuCount: number }> {
  const employerId = parseMenuEmployerId(input.employerId);
  const updatedBy = parseAuditUserId(input.updatedBy);
  const rows = await loadMenuRows(db, employerId);
  const tree = buildMenuTree(rows);
  if (tree.length === 0) {
    throw new Error("This employer has no live menu rows to rebuild from.");
  }
  const xml = menuTreeToXml(tree);
  await db.$transaction(async (tx) => {
    await snapshotEmployerMenu(tx, employerId, updatedBy, "D", new Date());
    await upsertMenuXml(tx, employerId, xml, updatedBy);
    await snapshotEmployerMenu(tx, employerId, updatedBy, "I", new Date());
  });
  return { menuCount: rows.length };
}

export async function restoreMenuSnapshot(
  db: HrmsDb,
  input: { employerId: number; snapshotKey: string; updatedBy: number },
): Promise<RestoreMenuResult> {
  const employerId = parseMenuEmployerId(input.employerId);
  const updatedBy = parseAuditUserId(input.updatedBy);
  const snapshotKey = input.snapshotKey.trim();
  if (snapshotKey === "") {
    throw new Error("Choose a history snapshot.");
  }
  const snapshot = await loadSnapshot(db, employerId, snapshotKey);
  if (classifyMenuXml(snapshot.xml) !== "healthy") {
    throw new Error("That snapshot has no menu items.");
  }
  const hierarchy = hierarchyFromXml(snapshot.xml).filter((item) => item.menuId > 1);
  const details = await loadDetailHistory(db, employerId, snapshot.historyCreatedAt, snapshot.actionType);

  await db.$transaction(async (tx) => {
    await snapshotEmployerMenu(tx, employerId, updatedBy, "D", new Date());
    if (details.length > 0) {
      await replaceDetailsFromHistory(tx, employerId, details, updatedBy);
    }
    await replaceHierarchy(tx, employerId, hierarchy, updatedBy);
    await upsertMenuXml(tx, employerId, snapshot.xml, updatedBy);
    await snapshotEmployerMenu(tx, employerId, updatedBy, "I", new Date());
  });

  return { menuCount: hierarchy.length, detailCount: details.length };
}

export async function previewTemplateCopy(
  db: HrmsDb,
  employerIds: number[],
): Promise<CopyEmployerPreview[]> {
  const targets = parseCopyTargets(employerIds);
  const template = await loadTemplateMenuNodes(db);
  if (template.length === 0) {
    throw new Error("The template menu is empty, so there is nothing to copy.");
  }
  const mappings = await loadModuleMappings(db);
  const incomplete = incompleteModuleLinks(template, mappings);
  if (incomplete.length > 0) {
    const listed = incomplete
      .slice(0, 12)
      .map((item) => `${item.menuName} (${item.menuId})`)
      .join(", ");
    throw new Error(
      `Nothing was copied. These template menus have no module and are not marked general, so they would be removed from organizations: ${listed}.`,
    );
  }
  const names = await loadEmployerNames(db, targets);
  const previews: CopyEmployerPreview[] = [];
  for (const employerId of targets) {
    if (!names.has(employerId)) {
      previews.push({
        employerId,
        employerName: null,
        keptCount: 0,
        droppedCount: 0,
        dropped: [],
        skippedReason: "Employer was not found.",
      });
      continue;
    }
    const licensed = await loadLicensedModuleIds(db, employerId);
    const filtered = filterMenuTreeByModules(template, mappings, licensed);
    const keptCount = countNodes(filtered.tree);
    previews.push({
      employerId,
      employerName: names.get(employerId) ?? null,
      keptCount,
      droppedCount: filtered.dropped.length,
      dropped: filtered.dropped.slice(0, 20),
      skippedReason:
        keptCount === 0
          ? "The module filter would leave this organization with no menus, so it will not be changed."
          : null,
    });
  }
  return previews;
}

export async function copyTemplateToEmployers(
  db: HrmsDb,
  input: { employerIds: number[]; updatedBy: number },
): Promise<CopyTemplateResult> {
  const updatedBy = parseAuditUserId(input.updatedBy);
  const previews = await previewTemplateCopy(db, input.employerIds);
  const template = await loadTemplateMenuNodes(db);
  const mappings = await loadModuleMappings(db);
  const result: CopyTemplateResult = { updated: [], skipped: [], failed: [] };

  for (const preview of previews) {
    if (preview.skippedReason) {
      result.skipped.push({ employerId: preview.employerId, reason: preview.skippedReason });
      continue;
    }
    try {
      const licensed = await loadLicensedModuleIds(db, preview.employerId);
      const filtered = filterMenuTreeByModules(template, mappings, licensed);
      if (countNodes(filtered.tree) === 0) {
        result.skipped.push({
          employerId: preview.employerId,
          reason: "The module filter would leave this organization with no menus.",
        });
        continue;
      }
      await db.$transaction(async (tx) => {
        await replaceEmployerFromTemplate(tx, preview.employerId, filtered.tree, updatedBy);
      });
      result.updated.push(preview.employerId);
    } catch (error) {
      result.failed.push({
        employerId: preview.employerId,
        reason: error instanceof Error ? error.message : "Copy failed.",
      });
    }
  }
  return result;
}

async function replaceEmployerFromTemplate(
  tx: Tx,
  employerId: number,
  tree: MenuNode[],
  updatedBy: number,
): Promise<void> {
  await snapshotEmployerMenu(tx, employerId, updatedBy, "D", new Date());
  await tx.$executeRaw`DELETE FROM dbo.TMenuHierarchy WHERE Employerid = ${employerId}`;
  await tx.$executeRaw`DELETE FROM dbo.tMenuDetails WHERE Employerid = ${employerId}`;
  const flat = flattenNamed(tree);
  for (const row of flat) {
    await tx.$executeRaw`
      INSERT INTO dbo.tMenuDetails (
          MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname
      )
      SELECT
          Template.MenuId,
          ${row.menuName},
          Template.NavigateURL,
          Template.PageName,
          ${row.isActive ? 1 : 0},
          ${employerId},
          ${updatedBy},
          GETDATE(),
          Template.iconname
      FROM dbo.tMenuDetails AS Template
      WHERE Template.Employerid = 0
          AND Template.MenuId = ${row.menuId}
    `;
  }
  await replaceHierarchy(tx, employerId, hierarchyFromTree(tree), updatedBy);
  await upsertMenuXml(tx, employerId, menuTreeToXml(tree), updatedBy);
  await snapshotEmployerMenu(tx, employerId, updatedBy, "I", new Date());
}

async function snapshotEmployerMenu(
  tx: Tx,
  employerId: number,
  updatedBy: number,
  action: "D" | "I",
  stampedAt: Date,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO dbo.TDynamicMenuHierarchyHistory (
        Transid, DynamicMenuXML, Createdby, Createdate, Lastupdateby, Lastupdatedate,
        employerid, HistoryCreatedBy, HistoryCreatedDate, ActionType
    )
    SELECT
        Hierarchy.Transid,
        Hierarchy.DynamicMenuXML,
        Hierarchy.Createdby,
        Hierarchy.Createdate,
        Hierarchy.Lastupdateby,
        Hierarchy.Lastupdatedate,
        Hierarchy.employerid,
        ${updatedBy},
        ${stampedAt},
        ${action}
    FROM dbo.TDynamicMenuHierarchy AS Hierarchy
    WHERE Hierarchy.employerid = ${employerId}
  `;
  await tx.$executeRaw`
    INSERT INTO dbo.TMenuHierarchyHistory (
        MenuId, ParentMenuId, CreateDate, CreatedBy, employerid,
        HistoryCreatedBy, HistoryCreatedDate, ActionType
    )
    SELECT
        Hierarchy.MenuId,
        Hierarchy.ParentMenuId,
        Hierarchy.CreateDate,
        Hierarchy.CreatedBy,
        Hierarchy.Employerid,
        ${updatedBy},
        ${stampedAt},
        ${action}
    FROM dbo.TMenuHierarchy AS Hierarchy
    WHERE Hierarchy.Employerid = ${employerId}
  `;
  await tx.$executeRaw`
    INSERT INTO dbo.tMenuDetailsHistory (
        MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid,
        ModifiedBy, ModifiedDate, HistoryCreatedBy, HistoryCreatedDate, ActionType
    )
    SELECT
        Menu.MenuId,
        Menu.MenuName,
        Menu.NavigateURL,
        Menu.PageName,
        Menu.ISActive,
        Menu.Employerid,
        Menu.CreatedBy,
        Menu.CreatedDate,
        ${updatedBy},
        ${stampedAt},
        ${action}
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.Employerid = ${employerId}
  `;
}

async function replaceHierarchy(
  tx: Tx,
  employerId: number,
  items: HierarchyItem[],
  updatedBy: number,
): Promise<void> {
  await tx.$executeRaw`DELETE FROM dbo.TMenuHierarchy WHERE Employerid = ${employerId}`;
  for (const group of chunks(items, 40)) {
    const selects = group.map(
      (item) => Prisma.sql`
        SELECT
            ${item.menuId} AS MenuId,
            ${item.parentMenuId} AS ParentMenuId,
            GETDATE() AS CreateDate,
            ${updatedBy} AS CreatedBy,
            ${employerId} AS Employerid,
            ${item.parentSeq} AS parentseq
      `,
    );
    await tx.$executeRaw`
      INSERT INTO dbo.TMenuHierarchy (
          MenuId, ParentMenuId, CreateDate, CreatedBy, Employerid, parentseq
      )
      ${Prisma.join(selects, " UNION ALL ")}
    `;
  }
}

async function upsertMenuXml(
  tx: Tx,
  employerId: number,
  xml: string,
  updatedBy: number,
): Promise<void> {
  const updated = await tx.$executeRaw`
    UPDATE dbo.TDynamicMenuHierarchy
    SET DynamicMenuXML = ${xml},
        Lastupdateby = ${updatedBy},
        Lastupdatedate = GETDATE()
    WHERE employerid = ${employerId}
  `;
  if (Number(updated) === 0) {
    await tx.$executeRaw`
      INSERT INTO dbo.TDynamicMenuHierarchy (DynamicMenuXML, Createdby, Createdate, employerid)
      VALUES (${xml}, ${updatedBy}, GETDATE(), ${employerId})
    `;
  }
}

async function deleteMenus(tx: Tx, employerId: number, menuIds: number[]): Promise<void> {
  if (menuIds.length === 0) {
    return;
  }
  await tx.$executeRaw`
    DELETE FROM dbo.tMenuDetails
    WHERE Employerid = ${employerId}
        AND MenuId IN (${Prisma.join(menuIds)})
  `;
}

async function assertTemplateMenus(db: HrmsDb, menuIds: number[]): Promise<void> {
  if (menuIds.length === 0) {
    return;
  }
  const rows = await db.$queryRaw<Array<{ MenuId: number }>>`
    SELECT Menu.MenuId
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.Employerid = 0
        AND Menu.MenuId IN (${Prisma.join(menuIds)})
  `;
  const found = new Set(rows.map((row) => row.MenuId));
  const missing = menuIds.filter((menuId) => !found.has(menuId));
  if (missing.length > 0) {
    throw new Error(
      `These menus are not on the template, so they cannot be added here: ${missing.join(", ")}.`,
    );
  }
}

type HistoryDetail = {
  menuId: number;
  menuName: string;
  navigateUrl: string | null;
  pageName: string | null;
  isActive: boolean;
};

async function loadSnapshot(
  db: HrmsDb,
  employerId: number,
  snapshotKey: string,
): Promise<{ xml: string; historyCreatedAt: string; actionType: string }> {
  const rows = await db.$queryRaw<
    Array<{ DynamicMenuXML: string | null; HistoryCreatedAt: string | null; ActionType: string | null }>
  >`
    SELECT TOP (1)
        History.DynamicMenuXML,
        CONVERT(VARCHAR(23), History.HistoryCreatedDate, 121) AS HistoryCreatedAt,
        History.ActionType
    FROM dbo.TDynamicMenuHierarchyHistory AS History
    WHERE History.employerid = ${employerId}
        AND CONCAT(
            ISNULL(CONVERT(VARCHAR(23), History.HistoryCreatedDate, 121), ''),
            '|',
            ISNULL(History.ActionType, ''),
            '|',
            CONVERT(VARCHAR(20), ISNULL(DATALENGTH(History.DynamicMenuXML), 0)),
            '|',
            CONVERT(VARCHAR(20), ISNULL(History.Transid, 0))
        ) = ${snapshotKey}
  `;
  const row = rows[0];
  if (!row?.DynamicMenuXML) {
    throw new Error("That history snapshot was not found.");
  }
  return {
    xml: row.DynamicMenuXML,
    historyCreatedAt: row.HistoryCreatedAt ?? "",
    actionType: row.ActionType ?? "",
  };
}

async function loadDetailHistory(
  db: HrmsDb,
  employerId: number,
  historyCreatedAt: string,
  actionType: string,
): Promise<HistoryDetail[]> {
  if (historyCreatedAt === "") {
    return [];
  }
  const rows = await db.$queryRaw<
    Array<{
      MenuId: number;
      MenuName: string | null;
      NavigateURL: string | null;
      PageName: string | null;
      ISActive: boolean | number | null;
    }>
  >`
    SELECT
        History.MenuId,
        History.MenuName,
        History.NavigateURL,
        History.PageName,
        History.ISActive
    FROM dbo.tMenuDetailsHistory AS History
    WHERE History.Employerid = ${employerId}
        AND ISNULL(History.ActionType, '') = ${actionType}
        AND ISNULL(CONVERT(VARCHAR(23), History.HistoryCreatedDate, 121), '') = ${historyCreatedAt}
        AND History.MenuId > 1
  `;
  const byId = new Map<number, HistoryDetail>();
  for (const row of rows) {
    byId.set(row.MenuId, {
      menuId: row.MenuId,
      menuName: row.MenuName?.trim() || `Menu ${row.MenuId}`,
      navigateUrl: row.NavigateURL,
      pageName: row.PageName,
      isActive: row.ISActive === true || row.ISActive === 1,
    });
  }
  return [...byId.values()];
}

async function replaceDetailsFromHistory(
  tx: Tx,
  employerId: number,
  details: HistoryDetail[],
  updatedBy: number,
): Promise<void> {
  const menuIds = details.map((row) => row.menuId);
  const icons = await tx.$queryRaw<Array<{ MenuId: number; iconname: string | null; Employerid: number }>>`
    SELECT Menu.MenuId, Menu.iconname, Menu.Employerid
    FROM dbo.tMenuDetails AS Menu
    WHERE Menu.MenuId IN (${Prisma.join(menuIds)})
        AND Menu.Employerid IN (${employerId}, 0)
  `;
  const iconOf = new Map<number, string | null>();
  for (const row of icons) {
    if (!iconOf.has(row.MenuId) || row.Employerid === employerId) {
      iconOf.set(row.MenuId, row.iconname);
    }
  }
  await tx.$executeRaw`DELETE FROM dbo.tMenuDetails WHERE Employerid = ${employerId}`;
  for (const row of details) {
    await tx.$executeRaw`
      INSERT INTO dbo.tMenuDetails (
          MenuId, MenuName, NavigateURL, PageName, ISActive, Employerid, CreatedBy, CreatedDate, iconname
      )
      VALUES (
          ${row.menuId},
          ${row.menuName},
          ${row.navigateUrl},
          ${row.pageName},
          ${row.isActive ? 1 : 0},
          ${employerId},
          ${updatedBy},
          GETDATE(),
          ${iconOf.get(row.menuId) ?? null}
      )
    `;
  }
}

async function loadEmployerNames(db: HrmsDb, employerIds: number[]): Promise<Map<number, string | null>> {
  const rows = await db.$queryRaw<Array<{ Employerid: number; EmployerName: string | null }>>`
    SELECT Employer.Employerid, Employer.EmployerName
    FROM dbo.TEmployerDetails AS Employer
    WHERE Employer.Employerid IN (${Prisma.join(employerIds)})
  `;
  return new Map(rows.map((row) => [row.Employerid, row.EmployerName]));
}

function parseCopyTargets(employerIds: number[]): number[] {
  const unique = [...new Set(employerIds.map((employerId) => parseMenuEmployerId(employerId)))];
  const targets = unique.filter((employerId) => employerId > 0);
  if (targets.length === 0) {
    throw new Error("Choose at least one organization.");
  }
  if (targets.length > COPY_LIMIT) {
    throw new Error(`Copy at most ${COPY_LIMIT} organizations at a time.`);
  }
  return targets;
}

function flattenNamed(
  nodes: MenuNode[],
): Array<{ menuId: number; menuName: string; isActive: boolean }> {
  const rows: Array<{ menuId: number; menuName: string; isActive: boolean }> = [];
  for (const node of nodes) {
    rows.push({ menuId: node.menuId, menuName: node.menuName, isActive: node.isActive });
    rows.push(...flattenNamed(node.children));
  }
  return rows;
}

function countNodes(nodes: MenuNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function chunks<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}
