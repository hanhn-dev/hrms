export type MenuXmlHealth = "blank" | "root-only" | "healthy";

export type ArmSourceKind = "employer" | "parent" | "template";

export type ArmSource = {
  source: ArmSourceKind;
  sourceEmployerId: number;
};

export type MenuNode = {
  menuId: number;
  menuName: string;
  parentMenuId: number | null;
  parentSeq: number;
  isActive: boolean;
  navigateUrl: string | null;
  pageName: string | null;
  iconName: string | null;
  children: MenuNode[];
};

export type MenuRow = Omit<MenuNode, "children">;

export type HierarchyItem = {
  menuId: number;
  parentMenuId: number | null;
  parentSeq: number;
};

export type XmlMenuNode = {
  menuId: number;
  menuName: string;
  children: XmlMenuNode[];
};

export type ModuleMapping = {
  menuId: number;
  moduleId: number | null;
  isDefault: boolean;
};

export type DropReason = "no-mapping" | "module-not-licensed" | "empty-parent";

export type DroppedMenu = {
  menuId: number;
  menuName: string;
  reason: DropReason;
};

export type FlatMenuEdit = {
  menuId: number;
  menuName: string;
  isActive: boolean;
  parentMenuId: number | null;
};

const TREE_OPEN =
  '<?xml version="1.0" encoding="utf-16"?>\n<Tree AllowNodeEditing="True" EnableDragAndDrop="True" EnableDragAndDropBetweenNodes="True" OnClientContextMenuItemClicked="OnClientContextMenuItemClicked" FeatureGroupID="RadTreeViewDynamicMenu" EnableAjaxSkinRendering="False" RenderMode="Lightweight" Height="600px">';

export function resolveArmSource(input: {
  employerId: number;
  parentEmployerId: number | null;
  ownRowCount: number;
  parentRowCount: number;
}): ArmSource {
  if (input.ownRowCount > 0) {
    return { source: "employer", sourceEmployerId: input.employerId };
  }
  const parentId = input.parentEmployerId;
  if (parentId != null && parentId !== input.employerId && parentId !== 0 && input.parentRowCount > 0) {
    return { source: "parent", sourceEmployerId: parentId };
  }
  return { source: "template", sourceEmployerId: 0 };
}

export function classifyMenuXml(xml: string | null | undefined): MenuXmlHealth {
  if (xml == null || xml.trim() === "") {
    return "blank";
  }
  let nodes: XmlMenuNode[];
  try {
    nodes = parseMenuXml(xml);
  } catch {
    return "blank";
  }
  if (collectMenuIds(nodes).every((menuId) => menuId <= 1)) {
    return "root-only";
  }
  return "healthy";
}

export function parseMenuXml(xml: string): XmlMenuNode[] {
  const source = xml.trim();
  if (source === "") {
    return [];
  }
  const tokens = tokenizeNodes(source);
  const roots: XmlMenuNode[] = [];
  const stack: XmlMenuNode[] = [];

  for (const token of tokens) {
    if (token.kind === "close") {
      if (stack.length === 0) {
        throw new Error("Menu XML has a closing Node without an opening Node.");
      }
      const finished = stack.pop();
      if (!finished) {
        continue;
      }
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(finished);
      } else {
        roots.push(finished);
      }
      continue;
    }

    const node: XmlMenuNode = {
      menuId: token.menuId,
      menuName: token.menuName,
      children: [],
    };
    if (token.selfClosing) {
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      stack.push(node);
    }
  }

  if (stack.length > 0) {
    throw new Error("Menu XML has an unclosed Node.");
  }
  return roots;
}

export function hierarchyFromXml(xml: string): HierarchyItem[] {
  return hierarchyFromXmlNodes(parseMenuXml(xml));
}

export function hierarchyFromXmlNodes(nodes: XmlMenuNode[]): HierarchyItem[] {
  const results: HierarchyItem[] = [];
  let parentSeq = 1;

  const walk = (items: XmlMenuNode[], parentMenuId: number | null): void => {
    const parent = parentMenuId === 1 ? null : parentMenuId;
    for (const item of items) {
      results.push({
        menuId: item.menuId,
        parentMenuId: parent,
        parentSeq,
      });
      parentSeq += 1;
      walk(item.children, item.menuId);
    }
  };

  walk(nodes, null);
  return results;
}

export function buildMenuTree(rows: MenuRow[]): MenuNode[] {
  const normalized = rows
    .filter((row) => row.menuId > 1)
    .map((row) => ({
      ...row,
      parentMenuId: normalizeParentId(row.parentMenuId, row.menuId),
      children: [] as MenuNode[],
    }));
  const nodes = new Map<number, MenuNode>();
  const parentOf = new Map<number, number | null>();
  for (const row of normalized) {
    nodes.set(row.menuId, row);
    parentOf.set(row.menuId, row.parentMenuId);
  }

  const roots: MenuNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.parentMenuId;
    const parent = parentId == null ? undefined : nodes.get(parentId);
    if (parent && !createsCycle(node.menuId, parentId, parentOf)) {
      parent.children.push(node);
    } else {
      node.parentMenuId = null;
      roots.push(node);
    }
  }

  sortMenuNodes(roots);
  return roots;
}

export function hierarchyFromTree(nodes: MenuNode[]): HierarchyItem[] {
  const results: HierarchyItem[] = [];
  let parentSeq = 1;
  const walk = (items: MenuNode[], parentMenuId: number | null): void => {
    for (const item of items) {
      results.push({
        menuId: item.menuId,
        parentMenuId,
        parentSeq,
      });
      parentSeq += 1;
      walk(item.children, item.menuId);
    }
  };
  walk(nodes, null);
  return results;
}

export function menuTreeToXml(nodes: MenuNode[]): string {
  const body = nodes.map((node) => nodeToXml(node, 1)).join("\n");
  if (body === "") {
    return `${TREE_OPEN}\n</Tree>`;
  }
  return `${TREE_OPEN}\n${body}\n</Tree>`;
}

export function flattenMenuTree(nodes: MenuNode[]): FlatMenuEdit[] {
  const rows: FlatMenuEdit[] = [];
  const walk = (items: MenuNode[], parentMenuId: number | null): void => {
    for (const item of items) {
      rows.push({
        menuId: item.menuId,
        menuName: item.menuName,
        isActive: item.isActive,
        parentMenuId,
      });
      walk(item.children, item.menuId);
    }
  };
  walk(nodes, null);
  return rows;
}

export function treeFromFlat(rows: FlatMenuEdit[]): MenuNode[] {
  validateMenuEdits(rows);
  const nodes = new Map<number, MenuNode>();
  for (const row of rows) {
    nodes.set(row.menuId, {
      menuId: row.menuId,
      menuName: row.menuName.trim(),
      parentMenuId: normalizeParentId(row.parentMenuId, row.menuId),
      parentSeq: 0,
      isActive: row.isActive,
      navigateUrl: null,
      pageName: null,
      iconName: null,
      children: [],
    });
  }

  const roots: MenuNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.menuId);
    if (!node) {
      continue;
    }
    const parent = node.parentMenuId == null ? undefined : nodes.get(node.parentMenuId);
    if (parent) {
      parent.children.push(node);
    } else {
      node.parentMenuId = null;
      roots.push(node);
    }
  }

  let parentSeq = 1;
  const stamp = (items: MenuNode[], parentMenuId: number | null): void => {
    for (const item of items) {
      item.parentMenuId = parentMenuId;
      item.parentSeq = parentSeq;
      parentSeq += 1;
      stamp(item.children, item.menuId);
    }
  };
  stamp(roots, null);
  return roots;
}

export function validateMenuEdits(rows: FlatMenuEdit[]): void {
  const seen = new Set<number>();
  const byParent = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!Number.isInteger(row.menuId) || row.menuId <= 1) {
      throw new Error(`Menu id ${row.menuId} cannot be saved.`);
    }
    if (seen.has(row.menuId)) {
      throw new Error(`Menu id ${row.menuId} is listed more than once.`);
    }
    seen.add(row.menuId);
    const name = row.menuName.trim();
    if (name === "") {
      throw new Error(`Menu id ${row.menuId} needs a name.`);
    }
    if (name.length > 200) {
      throw new Error(`Menu "${name}" is longer than 200 characters.`);
    }
    const parentKey = row.parentMenuId == null ? "root" : String(row.parentMenuId);
    const names = byParent.get(parentKey) ?? new Set<string>();
    const key = name.toLocaleLowerCase();
    if (names.has(key)) {
      throw new Error(`Two menus under the same parent are both named "${name}".`);
    }
    names.add(key);
    byParent.set(parentKey, names);
  }

  for (const row of rows) {
    if (row.parentMenuId == null) {
      continue;
    }
    if (row.parentMenuId === 1) {
      continue;
    }
    if (!seen.has(row.parentMenuId)) {
      throw new Error(
        `Menu ${row.menuId} points at parent ${row.parentMenuId}, which is not in this tree.`,
      );
    }
    if (isDescendant(row.menuId, row.parentMenuId, rows)) {
      throw new Error(`Menu ${row.menuId} cannot be moved under itself.`);
    }
  }
}

export function moveMenuNode(
  nodes: MenuNode[],
  dragId: number,
  targetId: number,
  place: "before" | "after" | "inside",
): MenuNode[] {
  if (dragId === targetId) {
    return nodes;
  }
  const flat = flattenMenuTree(nodes);
  const moving = flat.find((row) => row.menuId === dragId);
  const target = flat.find((row) => row.menuId === targetId);
  if (!moving || !target) {
    return nodes;
  }
  if (isDescendant(dragId, targetId, flat)) {
    return nodes;
  }

  const without = removeNode(nodes, dragId);
  const detached = detachNode(nodes, dragId);
  if (!detached) {
    return nodes;
  }
  return insertNode(without, detached, targetId, place);
}

export function collectMenuIds(nodes: Array<{ menuId: number; children: unknown[] }>): number[] {
  const ids: number[] = [];
  const walk = (items: Array<{ menuId: number; children: unknown[] }>): void => {
    for (const item of items) {
      ids.push(item.menuId);
      walk(item.children as Array<{ menuId: number; children: unknown[] }>);
    }
  };
  walk(nodes);
  return ids;
}

export function menuIdMismatches(
  xmlIds: readonly number[],
  hierarchyIds: readonly number[],
): { inXmlMissingFromHierarchy: number[]; inHierarchyMissingFromXml: number[] } {
  const xml = new Set(xmlIds.filter((menuId) => menuId > 1));
  const hierarchy = new Set(hierarchyIds.filter((menuId) => menuId > 1));
  return {
    inXmlMissingFromHierarchy: [...xml].filter((menuId) => !hierarchy.has(menuId)).sort((a, b) => a - b),
    inHierarchyMissingFromXml: [...hierarchy].filter((menuId) => !xml.has(menuId)).sort((a, b) => a - b),
  };
}

export function incompleteModuleLinks(
  nodes: MenuNode[],
  mappings: ReadonlyMap<number, ModuleMapping>,
): Array<{ menuId: number; menuName: string }> {
  const found: Array<{ menuId: number; menuName: string }> = [];
  const walk = (items: MenuNode[]): void => {
    for (const item of items) {
      const mapping = mappings.get(item.menuId);
      if (!mapping || (!mapping.isDefault && mapping.moduleId == null)) {
        found.push({ menuId: item.menuId, menuName: item.menuName });
      }
      walk(item.children);
    }
  };
  walk(nodes);
  return found;
}

export function filterMenuTreeByModules(
  nodes: MenuNode[],
  mappings: ReadonlyMap<number, ModuleMapping>,
  licensedModuleIds: ReadonlySet<number>,
): { tree: MenuNode[]; dropped: DroppedMenu[] } {
  const dropped: DroppedMenu[] = [];

  const dropBranch = (node: MenuNode, reason: DropReason): void => {
    dropped.push({ menuId: node.menuId, menuName: node.menuName, reason });
    for (const child of node.children) {
      dropBranch(child, reason);
    }
  };

  const filterOne = (node: MenuNode): MenuNode | null => {
    const mapping = mappings.get(node.menuId);
    if (!mapping) {
      dropBranch(node, "no-mapping");
      return null;
    }
    if (!mapping.isDefault) {
      if (mapping.moduleId == null || !licensedModuleIds.has(mapping.moduleId)) {
        dropBranch(node, mapping.moduleId == null ? "no-mapping" : "module-not-licensed");
        return null;
      }
    }
    const children = filterList(node.children);
    if (node.children.length > 0 && children.length === 0) {
      dropped.push({ menuId: node.menuId, menuName: node.menuName, reason: "empty-parent" });
      return null;
    }
    return { ...node, children };
  };

  const filterList = (items: MenuNode[]): MenuNode[] => {
    const kept: MenuNode[] = [];
    for (const item of items) {
      const next = filterOne(item);
      if (next) {
        kept.push(next);
      }
    }
    return kept;
  };

  return { tree: filterList(nodes), dropped };
}

function normalizeParentId(parentMenuId: number | null, menuId: number): number | null {
  if (parentMenuId == null || parentMenuId === 1 || parentMenuId === menuId) {
    return null;
  }
  return parentMenuId;
}

function createsCycle(
  menuId: number,
  parentId: number | null,
  parentOf: Map<number, number | null>,
): boolean {
  let current = parentId;
  const seen = new Set<number>();
  while (current != null) {
    if (current === menuId || seen.has(current)) {
      return true;
    }
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

function isDescendant(ancestorId: number, maybeChildId: number, rows: FlatMenuEdit[]): boolean {
  const children = new Map<number, number[]>();
  for (const row of rows) {
    if (row.parentMenuId == null || row.parentMenuId === 1) {
      continue;
    }
    const list = children.get(row.parentMenuId) ?? [];
    list.push(row.menuId);
    children.set(row.parentMenuId, list);
  }
  const stack = [...(children.get(ancestorId) ?? [])];
  const seen = new Set<number>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null || seen.has(current)) {
      continue;
    }
    if (current === maybeChildId) {
      return true;
    }
    seen.add(current);
    stack.push(...(children.get(current) ?? []));
  }
  return false;
}

function sortMenuNodes(items: MenuNode[]): void {
  items.sort((left, right) => {
    const seq = left.parentSeq - right.parentSeq;
    if (seq !== 0) {
      return seq;
    }
    return left.menuName.localeCompare(right.menuName, undefined, { sensitivity: "base" });
  });
  for (const item of items) {
    sortMenuNodes(item.children);
  }
}

function nodeToXml(node: MenuNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const open = `${indent}<Node Text="${escapeXml(node.menuName)}" Value="${node.menuId}" Expanded="True"`;
  if (node.children.length === 0) {
    return `${open} />`;
  }
  const children = node.children.map((child) => nodeToXml(child, depth + 1)).join("\n");
  return `${open}>\n${children}\n${indent}</Node>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function unescapeXml(value: string): string {
  return value
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

type OpenToken = {
  kind: "open";
  menuId: number;
  menuName: string;
  selfClosing: boolean;
};

type CloseToken = { kind: "close" };

function tokenizeNodes(xml: string): Array<OpenToken | CloseToken> {
  const tokens: Array<OpenToken | CloseToken> = [];
  const pattern = /<Node\b([^>]*?)(\/)?\s*>|<\/Node\s*>/gi;
  for (const match of xml.matchAll(pattern)) {
    if (match[0].startsWith("</")) {
      tokens.push({ kind: "close" });
      continue;
    }
    const attrs = readAttributes(match[1] ?? "");
    const rawValue = attrs.Value ?? attrs.value;
    const menuId = Number(rawValue);
    if (!rawValue || !Number.isInteger(menuId)) {
      throw new Error("A menu Node is missing its Value.");
    }
    tokens.push({
      kind: "open",
      menuId,
      menuName: unescapeXml(attrs.Text ?? attrs.text ?? ""),
      selfClosing: match[2] === "/",
    });
  }
  return tokens;
}

function readAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"|([A-Za-z_:][\w:.-]*)\s*=\s*'([^']*)'/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) {
      attrs[match[1]] = match[2] ?? "";
    } else if (match[3]) {
      attrs[match[3]] = match[4] ?? "";
    }
  }
  return attrs;
}

function detachNode(nodes: MenuNode[], menuId: number): MenuNode | null {
  for (const node of nodes) {
    if (node.menuId === menuId) {
      return node;
    }
    const nested = detachNode(node.children, menuId);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function removeNode(nodes: MenuNode[], menuId: number): MenuNode[] {
  const kept: MenuNode[] = [];
  for (const node of nodes) {
    if (node.menuId === menuId) {
      continue;
    }
    kept.push({ ...node, children: removeNode(node.children, menuId) });
  }
  return kept;
}

function insertNode(
  nodes: MenuNode[],
  moving: MenuNode,
  targetId: number,
  place: "before" | "after" | "inside",
): MenuNode[] {
  if (place === "inside") {
    return nodes.map((node) => {
      if (node.menuId === targetId) {
        return {
          ...node,
          children: [...node.children, { ...moving, parentMenuId: node.menuId }],
        };
      }
      return { ...node, children: insertNode(node.children, moving, targetId, place) };
    });
  }

  const next: MenuNode[] = [];
  let placed = false;
  for (const node of nodes) {
    if (node.menuId === targetId && place === "before") {
      next.push({ ...moving, parentMenuId: node.parentMenuId });
      placed = true;
    }
    next.push({
      ...node,
      children: placed ? node.children : insertNode(node.children, moving, targetId, place),
    });
    if (node.menuId === targetId && place === "after") {
      next.push({ ...moving, parentMenuId: node.parentMenuId });
      placed = true;
    }
  }
  return next;
}
