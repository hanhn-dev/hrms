import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachTabsToMenuTree,
  buildMenuAccessTree,
  buildTabAccessTree,
  parseAccessKey,
  tabKey,
  type MenuAccessRow,
  type TabAccessRow,
} from "./tree.ts";

function menu(partial: Partial<MenuAccessRow> & { menuId: number }): MenuAccessRow {
  return {
    kind: "menu",
    key: String(partial.menuId),
    menuName: partial.menuName ?? `Menu ${partial.menuId}`,
    parentMenuId: partial.parentMenuId ?? null,
    parentSeq: partial.parentSeq ?? 1,
    masterIsActive: true,
    roleGrant: "Y",
    userGrant: "N",
    wouldShow: "Y",
    likelyCause: "OK",
    ...partial,
  };
}

function tab(partial: Partial<TabAccessRow> & { menuId: number; tabId: number }): TabAccessRow {
  return {
    kind: "tab",
    key: tabKey(partial.menuId, partial.tabId),
    tabName: partial.tabName ?? `Tab ${partial.tabId}`,
    menuName: "My Details",
    masterIsActive: true,
    roleGrant: "N",
    userGrant: "N",
    wouldShow: "N",
    likelyCause: "Neither role nor user has a tab grant",
    ...partial,
  };
}

describe("access tree", () => {
  it("nests tabs under the matching menu", () => {
    const roots = buildMenuAccessTree([
      menu({ menuId: 5, menuName: "My Details" }),
      menu({ menuId: 1314, menuName: "past experience", parentMenuId: 5 }),
    ]);
    const tree = attachTabsToMenuTree(roots, [
      tab({ menuId: 5, tabId: 60, tabName: "Personal Details" }),
      tab({ menuId: 5, tabId: 61, tabName: "Employment Details" }),
    ]);
    const myDetails = tree.find((node) => node.kind === "menu" && node.menuId === 5);
    assert.deepEqual(
      myDetails?.children.map((child) =>
        child.kind === "tab" ? child.tabName : child.menuName,
      ),
      ["past experience", "Employment Details", "Personal Details"],
    );
  });

  it("groups tabs under a flat menu list", () => {
    const tree = buildTabAccessTree(
      [
        menu({ menuId: 10, menuName: "Setup Master", parentMenuId: 1 }),
        menu({ menuId: 20, menuName: "Access Right Management", parentMenuId: 1 }),
        menu({ menuId: 99, menuName: "Unused" }),
      ],
      [
        tab({
          menuId: 10,
          tabId: 2,
          tabName: "Set Location",
          menuName: "Setup Master",
        }),
        tab({
          menuId: 10,
          tabId: 1,
          tabName: "Set Calender",
          menuName: "Setup Master",
        }),
        tab({
          menuId: 20,
          tabId: 9,
          tabName: "Setup Roles Permission",
          menuName: "Access Right Management",
        }),
      ],
    );
    assert.deepEqual(
      tree.map((node) => (node.kind === "menu" ? node.menuName : node.tabName)),
      ["Access Right Management", "Setup Master"],
    );
    const setup = tree.find((node) => node.kind === "menu" && node.menuId === 10);
    assert.deepEqual(
      setup?.children.map((child) =>
        child.kind === "tab" ? child.tabName : child.menuName,
      ),
      ["Set Calender", "Set Location"],
    );
  });

  it("parses tab and menu keys", () => {
    assert.deepEqual(parseAccessKey("5"), { kind: "menu", menuId: 5 });
    assert.deepEqual(parseAccessKey("tab:5:60"), { kind: "tab", menuId: 5, tabId: 60 });
    assert.equal(parseAccessKey("nope"), null);
  });
});
