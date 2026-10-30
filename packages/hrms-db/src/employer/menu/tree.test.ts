import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildMenuTree,
  classifyMenuXml,
  filterMenuTreeByModules,
  hierarchyFromTree,
  hierarchyFromXml,
  incompleteModuleLinks,
  menuIdMismatches,
  menuTreeToXml,
  moveMenuNode,
  parseMenuXml,
  resolveArmSource,
  treeFromFlat,
  type MenuNode,
  type MenuRow,
  type ModuleMapping,
} from "./tree.ts";

function row(partial: Partial<MenuRow> & Pick<MenuRow, "menuId" | "menuName">): MenuRow {
  return {
    parentMenuId: null,
    parentSeq: partial.menuId,
    isActive: true,
    navigateUrl: null,
    pageName: null,
    iconName: null,
    ...partial,
  };
}

function node(
  menuId: number,
  menuName: string,
  children: MenuNode[] = [],
  parentMenuId: number | null = null,
): MenuNode {
  return {
    menuId,
    menuName,
    parentMenuId,
    parentSeq: menuId,
    isActive: true,
    navigateUrl: null,
    pageName: null,
    iconName: null,
    children,
  };
}

describe("resolveArmSource", () => {
  it("keeps an employer row even when that row is the one blocking the template", () => {
    assert.deepEqual(
      resolveArmSource({
        employerId: 12,
        parentEmployerId: 0,
        ownRowCount: 1,
        parentRowCount: 1,
      }),
      { source: "employer", sourceEmployerId: 12 },
    );
  });

  it("uses the parent when this employer has no row", () => {
    assert.deepEqual(
      resolveArmSource({
        employerId: 12,
        parentEmployerId: 4,
        ownRowCount: 0,
        parentRowCount: 1,
      }),
      { source: "parent", sourceEmployerId: 4 },
    );
  });

  it("falls through to the template when neither this employer nor its parent has a row", () => {
    assert.deepEqual(
      resolveArmSource({
        employerId: 12,
        parentEmployerId: null,
        ownRowCount: 0,
        parentRowCount: 0,
      }),
      { source: "template", sourceEmployerId: 0 },
    );
    assert.deepEqual(
      resolveArmSource({
        employerId: 12,
        parentEmployerId: 0,
        ownRowCount: 0,
        parentRowCount: 1,
      }),
      { source: "template", sourceEmployerId: 0 },
    );
  });
});

describe("classifyMenuXml", () => {
  it("treats empty and unreadable xml as blank", () => {
    assert.equal(classifyMenuXml(null), "blank");
    assert.equal(classifyMenuXml("   "), "blank");
    assert.equal(classifyMenuXml("<Tree><Node Text='Broken'></Tree>"), "blank");
  });

  it("treats a DynamicMenu root with no real items as root-only", () => {
    const xml =
      '<Tree><Node Text="DynamicMenu" Value="1" Expanded="True" /></Tree>';
    assert.equal(classifyMenuXml(xml), "root-only");
  });

  it("treats a tree with a real menu as healthy", () => {
    const xml = '<Tree><Node Text="Leave" Value="10" /></Tree>';
    assert.equal(classifyMenuXml(xml), "healthy");
  });
});

describe("buildMenuTree", () => {
  it("turns parent 1 into a root and drops the synthetic DynamicMenu node", () => {
    const tree = buildMenuTree([
      row({ menuId: 1, menuName: "DynamicMenu", parentMenuId: null, parentSeq: 1 }),
      row({ menuId: 10, menuName: "Leave", parentMenuId: 1, parentSeq: 2 }),
      row({ menuId: 11, menuName: "Apply", parentMenuId: 10, parentSeq: 3 }),
    ]);
    assert.deepEqual(
      tree.map((item) => item.menuId),
      [10],
    );
    assert.equal(tree[0]?.children[0]?.menuId, 11);
    assert.equal(tree[0]?.parentMenuId, null);
  });

  it("breaks a cycle by keeping both menus as roots", () => {
    const tree = buildMenuTree([
      row({ menuId: 10, menuName: "A", parentMenuId: 11, parentSeq: 1 }),
      row({ menuId: 11, menuName: "B", parentMenuId: 10, parentSeq: 2 }),
    ]);
    assert.deepEqual(
      tree.map((item) => item.menuId).sort((left, right) => left - right),
      [10, 11],
    );
  });

  it("returns nothing for an empty list", () => {
    assert.deepEqual(buildMenuTree([]), []);
  });
});

describe("hierarchyFromXml", () => {
  it("numbers parentseq in document order and stores children of menu 1 at the top", () => {
    const xml = `<Tree>
      <Node Text="DynamicMenu" Value="1">
        <Node Text="Leave" Value="10">
          <Node Text="Apply" Value="11" />
        </Node>
        <Node Text="Reports" Value="20" />
      </Node>
    </Tree>`;
    assert.deepEqual(hierarchyFromXml(xml), [
      { menuId: 1, parentMenuId: null, parentSeq: 1 },
      { menuId: 10, parentMenuId: null, parentSeq: 2 },
      { menuId: 11, parentMenuId: 10, parentSeq: 3 },
      { menuId: 20, parentMenuId: null, parentSeq: 4 },
    ]);
  });
});

describe("menuTreeToXml", () => {
  it("round-trips names, ids, and nesting", () => {
    const tree = [
      node(10, 'Leave & "Time"', [
        node(11, "Apply", [], 10),
      ]),
    ];
    const parsed = parseMenuXml(menuTreeToXml(tree));
    assert.equal(parsed[0]?.menuId, 10);
    assert.equal(parsed[0]?.menuName, 'Leave & "Time"');
    assert.equal(parsed[0]?.children[0]?.menuId, 11);
    assert.deepEqual(hierarchyFromTree(tree), [
      { menuId: 10, parentMenuId: null, parentSeq: 1 },
      { menuId: 11, parentMenuId: 10, parentSeq: 2 },
    ]);
  });
});

describe("menuIdMismatches", () => {
  it("ignores the synthetic root and lists ids on only one side", () => {
    assert.deepEqual(menuIdMismatches([1, 10, 12], [10, 11]), {
      inXmlMissingFromHierarchy: [12],
      inHierarchyMissingFromXml: [11],
    });
  });

  it("returns nothing when both sides are empty", () => {
    assert.deepEqual(menuIdMismatches([], []), {
      inXmlMissingFromHierarchy: [],
      inHierarchyMissingFromXml: [],
    });
  });
});

describe("filterMenuTreeByModules", () => {
  const mappings = new Map<number, ModuleMapping>([
    [10, { menuId: 10, moduleId: 5, isDefault: false }],
    [11, { menuId: 11, moduleId: 5, isDefault: false }],
    [12, { menuId: 12, moduleId: 9, isDefault: false }],
    [20, { menuId: 20, moduleId: null, isDefault: true }],
  ]);

  it("drops an unlicensed branch and then the parent left with no children", () => {
    const tree = [
      node(10, "Leave", [node(12, "Hidden", [], 10)]),
      node(20, "Home"),
    ];
    const filtered = filterMenuTreeByModules(tree, mappings, new Set([5]));
    assert.deepEqual(
      filtered.tree.map((item) => item.menuId),
      [20],
    );
    assert.deepEqual(
      filtered.dropped.map((item) => [item.menuId, item.reason]),
      [
        [12, "module-not-licensed"],
        [10, "empty-parent"],
      ],
    );
  });

  it("keeps a parent when a licensed child remains", () => {
    const tree = [node(10, "Leave", [node(11, "Apply", [], 10), node(12, "Hidden", [], 10)])];
    const filtered = filterMenuTreeByModules(tree, mappings, new Set([5]));
    assert.equal(filtered.tree[0]?.menuId, 10);
    assert.deepEqual(
      filtered.tree[0]?.children.map((child) => child.menuId),
      [11],
    );
  });

  it("names menus that would be removed because they have no module", () => {
    const tree = [node(30, "Orphan"), node(20, "Home")];
    assert.deepEqual(incompleteModuleLinks(tree, mappings), [
      { menuId: 30, menuName: "Orphan" },
    ]);
  });
});

describe("treeFromFlat", () => {
  it("rejects an empty name and a duplicate sibling name", () => {
    assert.throws(() => treeFromFlat([
      { menuId: 10, menuName: "  ", isActive: true, parentMenuId: null },
    ]), /needs a name/);
    assert.throws(() => treeFromFlat([
      { menuId: 10, menuName: "Leave", isActive: true, parentMenuId: null },
      { menuId: 11, menuName: "leave", isActive: true, parentMenuId: null },
    ]), /both named/);
  });

  it("moves a node before a sibling and renumbers parentseq", () => {
    const tree = treeFromFlat([
      { menuId: 10, menuName: "Leave", isActive: true, parentMenuId: null },
      { menuId: 20, menuName: "Reports", isActive: false, parentMenuId: null },
    ]);
    const moved = moveMenuNode(tree, 20, 10, "before");
    assert.deepEqual(hierarchyFromTree(moved), [
      { menuId: 20, parentMenuId: null, parentSeq: 1 },
      { menuId: 10, parentMenuId: null, parentSeq: 2 },
    ]);
    assert.equal(moved[0]?.isActive, false);
  });

  it("refuses to drop a node under its own child", () => {
    const tree = treeFromFlat([
      { menuId: 10, menuName: "Leave", isActive: true, parentMenuId: null },
      { menuId: 11, menuName: "Apply", isActive: true, parentMenuId: 10 },
    ]);
    const moved = moveMenuNode(tree, 10, 11, "inside");
    assert.equal(moved[0]?.menuId, 10);
    assert.equal(moved[0]?.children[0]?.menuId, 11);
  });
});
