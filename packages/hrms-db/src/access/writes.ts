import { Prisma } from "../generated/prisma/client";
import type { HrmsDb } from "../client";
import { menuIdSchema, parseEmployerId, tabIdSchema, userIdSchema } from "../ids";
import { ancestorMenuIds, type MenuAccessRow } from "./tree";

export type TabRight = {
  menuId: number;
  tabId: number;
  isEditable: "Y" | "N";
};

export type GrantRevokeMode = "GRANT" | "REVOKE";

type Tx = Parameters<Parameters<HrmsDb["$transaction"]>[0]>[0];

export async function listUserPageRows(
  db: HrmsDb,
  input: { userId: number; employerId: number; menuIds: number[] },
): Promise<Array<Record<string, unknown>>> {
  const userId = userIdSchema.parse(input.userId);
  const employerId = parseEmployerId(input.employerId);
  const menuIds = input.menuIds.map((id) => menuIdSchema.parse(id));
  if (menuIds.length === 0) {
    return [];
  }
  return db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
        UserPages.PageId AS MenuId,
        Menu.MenuName,
        UserPages.roleid,
        UserPages.LocationIds,
        UserPages.BusinessUnitIds
    FROM dbo.TUSerPagesMapping AS UserPages
    LEFT JOIN dbo.tMenuDetails AS Menu
        ON Menu.MenuId = UserPages.PageId
        AND Menu.Employerid = UserPages.Employerid
    WHERE UserPages.UserID = ${userId}
        AND UserPages.Employerid = ${employerId}
        AND UserPages.PageId IN (${Prisma.join(menuIds)})
  `;
}

export async function listUserRolePreview(
  db: HrmsDb,
  input: { userId: number; employerId: number },
): Promise<Array<Record<string, unknown>>> {
  const userId = userIdSchema.parse(input.userId);
  const employerId = parseEmployerId(input.employerId);
  return db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
        Users.UserID,
        Users.RoleID AS CurrentRoleId,
        Roles.RoleName AS CurrentRoleName,
        Users.ReportingType,
        Users.IsGlobalAccess
    FROM dbo.TUsers AS Users
    LEFT JOIN dbo.TRoles AS Roles
        ON Roles.RoleID = Users.RoleID
    WHERE Users.UserID = ${userId}
        AND Users.Employerid = ${employerId}
  `;
}

export function menuIdsForGrant(
  selectedMenuIds: number[],
  menus: MenuAccessRow[],
): number[] {
  const menusById = new Map(menus.map((menu) => [menu.menuId, menu]));
  const withParents = new Set(selectedMenuIds.map((id) => menuIdSchema.parse(id)));
  for (const menuId of selectedMenuIds) {
    for (const ancestorId of ancestorMenuIds(menuId, menusById)) {
      withParents.add(ancestorId);
    }
  }
  return [...withParents].sort((left, right) => left - right);
}

export async function assignUserRole(
  db: HrmsDb,
  input: {
    userId: number;
    employerId: number;
    roleId: number;
    updatedBy: number;
  },
): Promise<void> {
  const userId = userIdSchema.parse(input.userId);
  const employerId = parseEmployerId(input.employerId);
  const roleId = input.roleId;
  const updatedBy = input.updatedBy;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO dbo.TUsersHistory (
          UserID, UserName, PasswordStr, RoleID, UserEmail, IsActive,
          ChangedOn, ChangedBy, Employerid, IsGlobalAccess, EmployerIds,
          HistoryCreatedBy, HistoryCreatedDate, ActionType
      )
      SELECT
          Users.UserID, Users.UserName, Users.PasswordStr, Users.RoleID,
          Users.UserEmail, Users.IsActive,
          ISNULL(Users.ModifiedDate, Users.CreatedDate),
          ISNULL(Users.ModifiedBy, Users.CreatedBy),
          Users.Employerid, Users.IsGlobalAccess, Users.EmployerIds,
          ISNULL(Users.ModifiedBy, Users.CreatedBy),
          ISNULL(Users.ModifiedDate, Users.CreatedDate),
          'U'
      FROM dbo.TUsers AS Users
      WHERE Users.UserID = ${userId}
          AND Users.Employerid = ${employerId}
    `;
    await tx.$executeRaw`
      UPDATE Users
      SET
          Users.RoleID = ${roleId},
          Users.ModifiedBy = ${updatedBy},
          Users.ModifiedDate = GETDATE()
      FROM dbo.TUsers AS Users
      WHERE Users.UserID = ${userId}
          AND Users.Employerid = ${employerId}
    `;
  });
}

async function nextPageHistoryTransId(tx: Tx, employerId: number): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ nextId: number }>>`
    SELECT ISNULL(MAX(UserPageHistory.transid), 0) + 1 AS nextId
    FROM dbo.TUSerPagesMappingHistory AS UserPageHistory
    WHERE UserPageHistory.Employerid = ${employerId}
  `;
  return Number(rows[0]?.nextId ?? 1);
}

async function nextTabHistoryTransId(tx: Tx, employerId: number): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ nextId: number }>>`
    SELECT ISNULL(MAX(UserTabHistory.TransId), 0) + 1 AS nextId
    FROM dbo.TUserTabDetailsHistory AS UserTabHistory
    WHERE UserTabHistory.Employerid = ${employerId}
  `;
  return Number(rows[0]?.nextId ?? 1);
}

export async function grantRevokeUserAccess(
  db: HrmsDb,
  input: {
    userId: number;
    employerId: number;
    roleId: number | null;
    createdBy: number;
    mode: GrantRevokeMode;
    menuIds: number[];
    tabs: TabRight[];
  },
): Promise<void> {
  const userId = userIdSchema.parse(input.userId);
  const employerId = parseEmployerId(input.employerId);
  const menuIds = input.menuIds.map((id) => menuIdSchema.parse(id));
  const tabs = input.tabs.map((tab) => ({
    menuId: menuIdSchema.parse(tab.menuId),
    tabId: tabIdSchema.parse(tab.tabId),
    isEditable: tab.isEditable === "N" ? ("N" as const) : ("Y" as const),
  }));
  const roleId = input.roleId;
  const createdBy = input.createdBy;

  if (menuIds.length === 0 && tabs.length === 0) {
    throw new Error("Select at least one menu or tab.");
  }

  await db.$transaction(async (tx) => {
    if (input.mode === "GRANT") {
      if (menuIds.length > 0) {
        const pageTransId = await nextPageHistoryTransId(tx, employerId);
        await tx.$executeRaw`
          INSERT INTO dbo.TUSerPagesMapping (
              UserID, PageId, CreatedBy, CreationDate, Employerid, CreationDateUtcTime, roleid
          )
          SELECT
              ${userId}, MenuId.value, ${createdBy}, GETDATE(),
              ${employerId}, GETUTCDATE(), ${roleId}
          FROM (VALUES ${Prisma.join(menuIds.map((id) => Prisma.sql`(${id})`))}) AS MenuId(value)
          WHERE NOT EXISTS (
              SELECT 1
              FROM dbo.TUSerPagesMapping AS UserPages
              WHERE UserPages.UserID = ${userId}
                  AND UserPages.PageId = MenuId.value
                  AND UserPages.Employerid = ${employerId}
          )
        `;
        await tx.$executeRaw`
          INSERT INTO dbo.TUSerPagesMappingHistory (
              UserID, PageId, ModifiedBy, Modifiedon, transid, Employerid, ModifiedUtcTime, roleid
          )
          SELECT
              ${userId}, MenuId.value, ${createdBy}, GETDATE(),
              ${pageTransId}, ${employerId}, GETUTCDATE(), ${roleId}
          FROM (VALUES ${Prisma.join(menuIds.map((id) => Prisma.sql`(${id})`))}) AS MenuId(value)
          WHERE EXISTS (
              SELECT 1
              FROM dbo.TUSerPagesMapping AS UserPages
              WHERE UserPages.UserID = ${userId}
                  AND UserPages.PageId = MenuId.value
                  AND UserPages.Employerid = ${employerId}
          )
        `;
      }
      if (tabs.length > 0) {
        const tabTransId = await nextTabHistoryTransId(tx, employerId);
        const values = Prisma.join(
          tabs.map((tab) => Prisma.sql`(${tab.menuId}, ${tab.tabId}, ${tab.isEditable})`),
        );
        await tx.$executeRaw`
          INSERT INTO dbo.TUserTabDetails (
              UserId, MenuId, TabId, Employerid, IsEditable, CreatedBy, CreatedDate
          )
          SELECT
              ${userId}, TabRight.MenuId, NULLIF(TabRight.TabId, 0),
              ${employerId}, TabRight.IsEditable, ${createdBy}, CAST(GETDATE() AS DATE)
          FROM (VALUES ${values}) AS TabRight(MenuId, TabId, IsEditable)
          WHERE NOT EXISTS (
              SELECT 1
              FROM dbo.TUserTabDetails AS UserTabs
              WHERE UserTabs.UserId = ${userId}
                  AND UserTabs.Employerid = ${employerId}
                  AND UserTabs.MenuId = TabRight.MenuId
                  AND (
                      (UserTabs.TabId IS NULL AND NULLIF(TabRight.TabId, 0) IS NULL)
                      OR UserTabs.TabId = NULLIF(TabRight.TabId, 0)
                  )
          )
        `;
        await tx.$executeRaw`
          INSERT INTO dbo.TUserTabDetailsHistory (
              UserId, MenuId, TabId, Employerid, IsEditable, ModifyBy, ModifyDate,
              TransId, HistoryCreatedBy, HistoryCreatedDate, ActionType
          )
          SELECT
              ${userId}, TabRight.MenuId, NULLIF(TabRight.TabId, 0),
              ${employerId}, TabRight.IsEditable, ${createdBy}, CAST(GETDATE() AS DATE),
              ${tabTransId}, ${createdBy}, GETDATE(), 'I'
          FROM (VALUES ${values}) AS TabRight(MenuId, TabId, IsEditable)
        `;
      }
      return;
    }

    if (menuIds.length > 0) {
      const pageTransId = await nextPageHistoryTransId(tx, employerId);
      const tabTransId = await nextTabHistoryTransId(tx, employerId);
      await tx.$executeRaw`
        INSERT INTO dbo.TUSerPagesMappingHistory (
            UserID, PageId, ModifiedBy, Modifiedon, transid, Employerid, ModifiedUtcTime, roleid,
            LocationIds, BusinessUnitIds
        )
        SELECT
            UserPages.UserID, UserPages.PageId, ${createdBy}, GETDATE(),
            ${pageTransId}, UserPages.Employerid, GETUTCDATE(), UserPages.roleid,
            UserPages.LocationIds, UserPages.BusinessUnitIds
        FROM dbo.TUSerPagesMapping AS UserPages
        WHERE UserPages.UserID = ${userId}
            AND UserPages.Employerid = ${employerId}
            AND UserPages.PageId IN (${Prisma.join(menuIds)})
      `;
      await tx.$executeRaw`
        DELETE UserPages
        FROM dbo.TUSerPagesMapping AS UserPages
        WHERE UserPages.UserID = ${userId}
            AND UserPages.Employerid = ${employerId}
            AND UserPages.PageId IN (${Prisma.join(menuIds)})
      `;
      await tx.$executeRaw`
        INSERT INTO dbo.TUserTabDetailsHistory (
            UserId, MenuId, TabId, Employerid, IsEditable, ModifyBy, ModifyDate,
            TransId, HistoryCreatedBy, HistoryCreatedDate, ActionType
        )
        SELECT
            UserTabs.UserId, UserTabs.MenuId, UserTabs.TabId, UserTabs.Employerid,
            UserTabs.IsEditable, ${createdBy}, CAST(GETDATE() AS DATE),
            ${tabTransId}, ${createdBy}, GETDATE(), 'D'
        FROM dbo.TUserTabDetails AS UserTabs
        WHERE UserTabs.UserId = ${userId}
            AND UserTabs.Employerid = ${employerId}
            AND UserTabs.MenuId IN (${Prisma.join(menuIds)})
      `;
      await tx.$executeRaw`
        DELETE UserTabs
        FROM dbo.TUserTabDetails AS UserTabs
        WHERE UserTabs.UserId = ${userId}
            AND UserTabs.Employerid = ${employerId}
            AND UserTabs.MenuId IN (${Prisma.join(menuIds)})
      `;
    }

    const tabsOnly = tabs.filter((tab) => !menuIds.includes(tab.menuId));
    if (tabsOnly.length > 0) {
      const tabTransId = await nextTabHistoryTransId(tx, employerId);
      const values = Prisma.join(
        tabsOnly.map((tab) => Prisma.sql`(${tab.menuId}, ${tab.tabId})`),
      );
      await tx.$executeRaw`
        INSERT INTO dbo.TUserTabDetailsHistory (
            UserId, MenuId, TabId, Employerid, IsEditable, ModifyBy, ModifyDate,
            TransId, HistoryCreatedBy, HistoryCreatedDate, ActionType
        )
        SELECT
            UserTabs.UserId, UserTabs.MenuId, UserTabs.TabId, UserTabs.Employerid,
            UserTabs.IsEditable, ${createdBy}, CAST(GETDATE() AS DATE),
            ${tabTransId}, ${createdBy}, GETDATE(), 'D'
        FROM dbo.TUserTabDetails AS UserTabs
        INNER JOIN (VALUES ${values}) AS TabRight(MenuId, TabId)
            ON TabRight.MenuId = UserTabs.MenuId
            AND (
                (UserTabs.TabId IS NULL AND NULLIF(TabRight.TabId, 0) IS NULL)
                OR UserTabs.TabId = NULLIF(TabRight.TabId, 0)
            )
        WHERE UserTabs.UserId = ${userId}
            AND UserTabs.Employerid = ${employerId}
      `;
      await tx.$executeRaw`
        DELETE UserTabs
        FROM dbo.TUserTabDetails AS UserTabs
        INNER JOIN (VALUES ${values}) AS TabRight(MenuId, TabId)
            ON TabRight.MenuId = UserTabs.MenuId
            AND (
                (UserTabs.TabId IS NULL AND NULLIF(TabRight.TabId, 0) IS NULL)
                OR UserTabs.TabId = NULLIF(TabRight.TabId, 0)
            )
        WHERE UserTabs.UserId = ${userId}
            AND UserTabs.Employerid = ${employerId}
      `;
    }
  });
}
