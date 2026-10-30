import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { MenuNode } from "@hrms/db/menu-tree";
import { insertMenuNode, removeMenuLeaf } from "./menu-edit.ts";

function menu(menuId: number, children: MenuNode[] = []): MenuNode {
  return {
    menuId,
    menuName: `Menu ${menuId}`,
    parentMenuId: null,
    parentSeq: menuId,
    isActive: true,
    navigateUrl: null,
    pageName: null,
    iconName: null,
    children,
  };
}

describe("insertMenuNode", () => {
  it("adds under a nested parent and leaves the other branch alone", () => {
    const tree = [menu(10), menu(20, [menu(21)])];
    const next = insertMenuNode(tree, 21, { menuId: 30, menuName: "New" });
    assert.equal(next[0]?.children.length, 0);
    assert.equal(next[1]?.children[0]?.children[0]?.menuId, 30);
  });

  it("adds at the top when no parent is selected", () => {
    const next = insertMenuNode([menu(10)], null, { menuId: 30, menuName: "New" });
    assert.deepEqual(
      next.map((node) => node.menuId),
      [10, 30],
    );
  });

  it("does not remove a menu that still has children", () => {
    const tree = [menu(10, [menu(11)])];
    assert.equal(removeMenuLeaf(tree, 10)[0]?.menuId, 10);
    assert.equal(removeMenuLeaf(tree, 11)[0]?.children.length, 0);
  });
});
