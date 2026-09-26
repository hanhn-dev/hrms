import type { HrmsDb } from "../client";
import { asYesNo } from "../iso";
import { parseEmployerId } from "../ids";
import {
  attachTabsToMenuTree,
  buildMenuAccessTree,
  buildTabAccessTree,
  menuKey,
  tabKey,
  type AccessNode,
  type GrantFlag,
  type MenuAccessRow,
  type TabAccessRow,
} from "./tree";

export type TenantRoleOption = {
  roleId: number;
  roleName: string;
  isDefault: boolean | null;
  roleType: string | null;
};

export type TabMasterCheck = {
  employerId: number;
  tabMasterRows: number;
  userTabGrantRows: number;
  likelyCause: string;
};

export type EmployeeAccess = {
  menus: MenuAccessRow[];
  tabs: TabAccessRow[];
  tree: AccessNode[];
  tabTree: AccessNode[];
  tabMaster: TabMasterCheck;
  roles: TenantRoleOption[];
};

type MenuQueryRow = {
  MenuId: number;
  MenuName: string | null;
  ParentMenuId: number | null;
  ParentSeq: number | null;
  MasterIsActive: boolean | number | null;
  RoleGrant: string;
  UserGrant: string;
};

type TabQueryRow = {
  TabId: number;
  MenuId: number;
  TabName: string | null;
  MenuName: string | null;
  TabEmployerId: number | null;
  IsActive: string | null;
  UserGrant: string;
  RoleGrant: string;
};

type RoleQueryRow = {
  RoleID: number;
  RoleName: string;
  IsDefault: boolean | number | null;
  RoleType: string | null;
};

function isMasterActive(value: boolean | number | string | null): boolean {
  return value === true || value === 1 || value === "1";
}

function asGrant(value: string | null | undefined): GrantFlag {
  return value === "Y" ? "Y" : "N";
}

export async function loadEmployeeAccess(
  db: HrmsDb,
  input: {
    employerId: number;
    userId: number | null;
    roleId: number | null;
  },
): Promise<EmployeeAccess> {
  const employerId = parseEmployerId(input.employerId);
  const userId = input.userId;
  const roleId = input.roleId;

  const [menuRows, tabRows, tabMasterRows, roles] = await Promise.all([
    db.$queryRaw<MenuQueryRow[]>`
      SELECT
          Menu.MenuId,
          Menu.MenuName,
          Hierarchy.ParentMenuId,
          Hierarchy.parentseq AS ParentSeq,
          Menu.ISActive AS MasterIsActive,
          CASE WHEN RolePages.RoleID IS NOT NULL THEN 'Y' ELSE 'N' END AS RoleGrant,
          CASE WHEN UserPages.UserID IS NOT NULL THEN 'Y' ELSE 'N' END AS UserGrant
      FROM dbo.TMenuHierarchy AS Hierarchy
      INNER JOIN dbo.tMenuDetails AS Menu
          ON Menu.MenuId = Hierarchy.MenuID
          AND Menu.Employerid = Hierarchy.Employerid
      LEFT JOIN dbo.TRolePagesMapping AS RolePages
          ON RolePages.RoleID = ${roleId}
          AND RolePages.PageId = Menu.MenuId
          AND RolePages.Employerid = ${employerId}
      LEFT JOIN dbo.TUSerPagesMapping AS UserPages
          ON UserPages.UserID = ${userId}
          AND UserPages.PageId = Menu.MenuId
          AND UserPages.Employerid = ${employerId}
      WHERE Hierarchy.Employerid = ${employerId}
          AND Hierarchy.MenuID > 1
      ORDER BY Hierarchy.parentseq, Menu.MenuName
    `,
    db.$queryRaw<TabQueryRow[]>`
      SELECT
          Tab.Tabid AS TabId,
          Tab.MenuId,
          Tab.TabName,
          Menu.MenuName,
          Tab.Employerid AS TabEmployerId,
          Tab.IsActive,
          CASE WHEN UserTabs.UserTabid IS NOT NULL THEN 'Y' ELSE 'N' END AS UserGrant,
          CASE WHEN RoleTabs.RoleTabid IS NOT NULL THEN 'Y' ELSE 'N' END AS RoleGrant
      FROM dbo.TTabDetails AS Tab
      INNER JOIN dbo.tMenuDetails AS Menu
          ON Menu.MenuId = Tab.MenuId
          AND Menu.Employerid = ${employerId}
      LEFT JOIN dbo.TUserTabDetails AS UserTabs
          ON UserTabs.TabId = Tab.Tabid
          AND UserTabs.MenuId = Tab.MenuId
          AND UserTabs.UserId = ${userId}
          AND UserTabs.Employerid = ${employerId}
      LEFT JOIN dbo.TRoleTabDetails AS RoleTabs
          ON RoleTabs.TabId = Tab.Tabid
          AND RoleTabs.MenuId = Tab.MenuId
          AND RoleTabs.RoleId = ${roleId}
          AND RoleTabs.Employerid = ${employerId}
      WHERE Tab.MenuId IS NOT NULL
          AND (Tab.Employerid = ${employerId} OR Tab.Employerid = 0)
    `,
    db.$queryRaw<Array<{ TabMasterRows: number; UserTabGrantRows: number }>>`
      SELECT
          (
              SELECT COUNT(*)
              FROM dbo.TTabDetails AS Tab
              WHERE Tab.Employerid = ${employerId} OR Tab.Employerid = 0
          ) AS TabMasterRows,
          (
              SELECT COUNT(*)
              FROM dbo.TUserTabDetails AS UserTab
              WHERE UserTab.Employerid = ${employerId}
          ) AS UserTabGrantRows
    `,
    db.$queryRaw<RoleQueryRow[]>`
      SELECT
          Roles.RoleID,
          Roles.RoleName,
          Roles.IsDefault,
          Roles.RoleType
      FROM dbo.TRoles AS Roles
      WHERE Roles.IsActive = 'Y'
          AND (
              (Roles.IsDefault = 1 AND (Roles.Employerid = 0 OR Roles.Employerid = ${employerId}))
              OR (Roles.IsDefault = 0 AND Roles.Employerid = ${employerId})
          )
      ORDER BY Roles.IsDefault DESC, Roles.RoleName
    `,
  ]);

  const menus = menuRows.map((row): MenuAccessRow => {
    const active = isMasterActive(row.MasterIsActive);
    const roleGrant = asGrant(row.RoleGrant);
    const userGrant = asGrant(row.UserGrant);
    const wouldShow = active && (roleGrant === "Y" || userGrant === "Y");
    return {
      kind: "menu",
      key: menuKey(row.MenuId),
      menuId: row.MenuId,
      menuName: row.MenuName,
      parentMenuId: row.ParentMenuId,
      parentSeq: row.ParentSeq,
      masterIsActive: active,
      roleGrant,
      userGrant,
      wouldShow: asYesNo(wouldShow),
      likelyCause: !active
        ? "Menu master inactive for this tenant"
        : roleGrant === "N" && userGrant === "N"
          ? "Neither role nor user has a page grant"
          : "OK",
    };
  });

  const menuIds = new Set(menus.map((menu) => menu.menuId));
  const preferredTabs = new Map<string, TabQueryRow>();
  for (const row of tabRows) {
    if (!menuIds.has(row.MenuId)) {
      continue;
    }
    const key = `${row.MenuId}:${row.TabId}`;
    const existing = preferredTabs.get(key);
    if (!existing || (row.TabEmployerId === employerId && existing.TabEmployerId !== employerId)) {
      preferredTabs.set(key, row);
    }
  }

  const tabs = [...preferredTabs.values()].map((row): TabAccessRow => {
    const active = row.IsActive === "Y";
    const roleGrant = asGrant(row.RoleGrant);
    const userGrant = asGrant(row.UserGrant);
    const wouldShow = active && (roleGrant === "Y" || userGrant === "Y");
    return {
      kind: "tab",
      key: tabKey(row.MenuId, row.TabId),
      menuId: row.MenuId,
      tabId: row.TabId,
      tabName: row.TabName,
      menuName: row.MenuName,
      masterIsActive: active,
      roleGrant,
      userGrant,
      wouldShow: asYesNo(wouldShow),
      likelyCause: !active
        ? "Tab master inactive"
        : roleGrant === "N" && userGrant === "N"
          ? "Neither role nor user has a tab grant"
          : "OK",
    };
  });

  const tree = attachTabsToMenuTree(buildMenuAccessTree(menus), tabs);
  const tabTree = buildTabAccessTree(menus, tabs);
  const tabMasterRow = tabMasterRows[0];
  const tabMasterRowsCount = Number(tabMasterRow?.TabMasterRows ?? 0);
  const userTabGrantRows = Number(tabMasterRow?.UserTabGrantRows ?? 0);

  return {
    menus,
    tabs,
    tree,
    tabTree,
    tabMaster: {
      employerId,
      tabMasterRows: tabMasterRowsCount,
      userTabGrantRows,
      likelyCause:
        tabMasterRowsCount === 0
          ? "TTabDetails has zero rows for this employer and Employerid 0 — tabs will not resolve."
          : "TTabDetails has master rows (tenant or Employerid 0).",
    },
    roles: roles.map((row) => ({
      roleId: row.RoleID,
      roleName: row.RoleName,
      isDefault: row.IsDefault === true || row.IsDefault === 1,
      roleType: row.RoleType,
    })),
  };
}
