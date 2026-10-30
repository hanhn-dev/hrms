import type { MenuNode } from "@hrms/db/menu-tree";

export function insertMenuNode(
  nodes: MenuNode[],
  parentId: number | null,
  item: { menuId: number; menuName: string },
): MenuNode[] {
  if (containsMenu(nodes, item.menuId)) {
    return nodes;
  }
  const child = makeNode(item, parentId);
  if (parentId == null) {
    return [...nodes, child];
  }
  let placed = false;
  const next = nodes.map((node) => {
    const updated = placeUnder(node, parentId, child, () => {
      placed = true;
    });
    return updated;
  });
  return placed ? next : [...nodes, { ...child, parentMenuId: null }];
}

export function removeMenuLeaf(nodes: MenuNode[], menuId: number): MenuNode[] {
  const kept: MenuNode[] = [];
  for (const node of nodes) {
    if (node.menuId === menuId) {
      if (node.children.length === 0) {
        continue;
      }
      kept.push(node);
      continue;
    }
    kept.push({ ...node, children: removeMenuLeaf(node.children, menuId) });
  }
  return kept;
}

function placeUnder(
  node: MenuNode,
  parentId: number,
  child: MenuNode,
  markPlaced: () => void,
): MenuNode {
  if (node.menuId === parentId) {
    markPlaced();
    return { ...node, children: [...node.children, { ...child, parentMenuId: parentId }] };
  }
  return {
    ...node,
    children: node.children.map((nested) => placeUnder(nested, parentId, child, markPlaced)),
  };
}

function containsMenu(nodes: MenuNode[], menuId: number): boolean {
  for (const node of nodes) {
    if (node.menuId === menuId || containsMenu(node.children, menuId)) {
      return true;
    }
  }
  return false;
}

function makeNode(item: { menuId: number; menuName: string }, parentMenuId: number | null): MenuNode {
  return {
    menuId: item.menuId,
    menuName: item.menuName,
    parentMenuId,
    parentSeq: 0,
    isActive: true,
    navigateUrl: null,
    pageName: null,
    iconName: null,
    children: [],
  };
}
