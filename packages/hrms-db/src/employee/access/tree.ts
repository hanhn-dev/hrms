export type GrantFlag = "Y" | "N";

export type MenuAccessRow = {
  kind: "menu";
  key: string;
  menuId: number;
  menuName: string | null;
  parentMenuId: number | null;
  parentSeq: number | null;
  masterIsActive: boolean | null;
  roleGrant: GrantFlag;
  userGrant: GrantFlag;
  wouldShow: GrantFlag;
  likelyCause: string;
};

export type TabAccessRow = {
  kind: "tab";
  key: string;
  menuId: number;
  tabId: number;
  tabName: string | null;
  menuName: string | null;
  masterIsActive: boolean | null;
  roleGrant: GrantFlag;
  userGrant: GrantFlag;
  wouldShow: GrantFlag;
  likelyCause: string;
};

export type AccessRow = MenuAccessRow | TabAccessRow;

export type AccessNode = AccessRow & {
  children: AccessNode[];
};

export function menuKey(menuId: number): string {
  return String(menuId);
}

export function tabKey(menuId: number, tabId: number): string {
  return `tab:${menuId}:${tabId}`;
}

export function parseAccessKey(
  key: string,
): { kind: "menu"; menuId: number } | { kind: "tab"; menuId: number; tabId: number } | null {
  if (key.startsWith("tab:")) {
    const [, menuIdText, tabIdText] = key.split(":");
    const menuId = Number(menuIdText);
    const tabId = Number(tabIdText);
    if (!Number.isInteger(menuId) || !Number.isInteger(tabId)) {
      return null;
    }
    return { kind: "tab", menuId, tabId };
  }
  const menuId = Number(key);
  if (!Number.isInteger(menuId) || menuId <= 0) {
    return null;
  }
  return { kind: "menu", menuId };
}

export function buildMenuAccessTree(menus: MenuAccessRow[]): AccessNode[] {
  const nodes = new Map<number, AccessNode>();
  for (const menu of menus) {
    nodes.set(menu.menuId, { ...menu, children: [] });
  }

  const roots: AccessNode[] = [];
  for (const node of nodes.values()) {
    if (node.kind !== "menu") {
      continue;
    }
    const parentId = node.parentMenuId;
    const parent =
      parentId != null && parentId !== node.menuId
        ? nodes.get(parentId)
        : undefined;
    if (parent && !createsMenuCycle(node.menuId, parentId, nodes)) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortAccessNodes(roots);
  return roots;
}

export function buildTabAccessTree(
  menus: MenuAccessRow[],
  tabs: TabAccessRow[],
): AccessNode[] {
  const menusById = new Map(menus.map((menu) => [menu.menuId, menu]));
  const groups = new Map<number, AccessNode>();

  for (const tab of tabs) {
    let group = groups.get(tab.menuId);
    if (!group) {
      const menu = menusById.get(tab.menuId);
      group = menu
        ? { ...menu, parentMenuId: null, parentSeq: null, children: [] }
        : {
            kind: "menu",
            key: menuKey(tab.menuId),
            menuId: tab.menuId,
            menuName: tab.menuName,
            parentMenuId: null,
            parentSeq: null,
            masterIsActive: true,
            roleGrant: "N",
            userGrant: "N",
            wouldShow: "N",
            likelyCause: "Menu not in tenant hierarchy",
            children: [],
          };
      groups.set(tab.menuId, group);
    }
    group.children.push({ ...tab, children: [] });
  }

  const roots = [...groups.values()];
  sortAccessNodes(roots);
  return roots;
}

export function attachTabsToMenuTree(
  roots: AccessNode[],
  tabs: TabAccessRow[],
): AccessNode[] {
  const nodes = new Map<number, AccessNode>();
  const walk = (items: AccessNode[]): void => {
    for (const item of items) {
      if (item.kind === "menu") {
        nodes.set(item.menuId, item);
      }
      walk(item.children);
    }
  };
  walk(roots);

  const orphanTabs: AccessNode[] = [];
  for (const tab of tabs) {
    const parent = nodes.get(tab.menuId);
    const child: AccessNode = { ...tab, children: [] };
    if (parent) {
      parent.children.push(child);
    } else {
      orphanTabs.push(child);
    }
  }

  sortAccessNodes(roots);
  sortAccessNodes(orphanTabs);
  return [...roots, ...orphanTabs];
}

export function collectExpandableKeys(nodes: AccessNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.children.length > 0) {
      keys.push(node.key);
      keys.push(...collectExpandableKeys(node.children));
    }
  }
  return keys;
}

export function ancestorMenuIds(
  menuId: number,
  menusById: Map<number, MenuAccessRow>,
): number[] {
  const ancestors: number[] = [];
  const seen = new Set<number>([menuId]);
  let current = menusById.get(menuId)?.parentMenuId ?? null;
  while (current != null && !seen.has(current)) {
    seen.add(current);
    if (!menusById.has(current)) {
      break;
    }
    ancestors.push(current);
    current = menusById.get(current)?.parentMenuId ?? null;
  }
  return ancestors;
}

function sortAccessNodes(items: AccessNode[]): void {
  items.sort(compareAccessNodes);
  for (const item of items) {
    sortAccessNodes(item.children);
  }
}

function compareAccessNodes(left: AccessNode, right: AccessNode): number {
  if (left.kind !== right.kind) {
    return left.kind === "menu" ? -1 : 1;
  }
  if (left.kind === "menu" && right.kind === "menu") {
    const seq =
      (left.parentSeq ?? Number.MAX_SAFE_INTEGER) -
      (right.parentSeq ?? Number.MAX_SAFE_INTEGER);
    if (seq !== 0) {
      return seq;
    }
    return (left.menuName ?? "").localeCompare(right.menuName ?? "", undefined, {
      sensitivity: "base",
    });
  }
  if (left.kind === "tab" && right.kind === "tab") {
    return (left.tabName ?? "").localeCompare(right.tabName ?? "", undefined, {
      sensitivity: "base",
    });
  }
  return 0;
}

function createsMenuCycle(
  menuId: number,
  parentId: number | null,
  nodes: Map<number, AccessNode>,
): boolean {
  let current = parentId;
  const seen = new Set<number>();
  while (current != null) {
    if (current === menuId || seen.has(current)) {
      return true;
    }
    seen.add(current);
    const parent = nodes.get(current);
    current = parent?.kind === "menu" ? parent.parentMenuId : null;
  }
  return false;
}
