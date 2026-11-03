import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { actorFromName, emptyWorkflowTree } from "@hrms/db/workflow-tree";
import { alignWorkflowLevels, treeForSave } from "./workflow-tree-levels.ts";

describe("alignWorkflowLevels", () => {
  it("pads empty levels up to the routing count", () => {
    const tree = emptyWorkflowTree("Leave", 1);
    tree.levels[0] = {
      level: 1,
      approvers: [actorFromName("Functional Authority")],
      notifications: [],
    };
    const aligned = alignWorkflowLevels(tree, 3);
    assert.deepEqual(
      aligned.levels.map((level) => level.level),
      [1, 2, 3],
    );
    assert.equal(aligned.levels[0]?.approvers[0]?.name, "Functional Authority");
    assert.equal(aligned.levels[1]?.approvers.length, 0);
    assert.equal(aligned.levels[2]?.notifications.length, 0);
  });

  it("pads when the saved tree has no levels", () => {
    const aligned = alignWorkflowLevels(emptyWorkflowTree("Leave", 0), 2);
    assert.deepEqual(
      aligned.levels.map((level) => level.level),
      [1, 2],
    );
    assert.equal(aligned.levels[0]?.approvers.length, 0);
  });

  it("keeps a higher level that already has approvers", () => {
    const tree = emptyWorkflowTree("Leave", 1);
    tree.levels.push({
      level: 2,
      approvers: [actorFromName("Reporting Authority")],
      notifications: [],
    });
    const aligned = alignWorkflowLevels(tree, 1);
    assert.deepEqual(
      aligned.levels.map((level) => level.level),
      [1, 2],
    );
    assert.equal(aligned.levels[1]?.approvers[0]?.name, "Reporting Authority");
  });

  it("keeps a higher level that only has notifications", () => {
    const tree = emptyWorkflowTree("Leave", 1);
    tree.levels.push({
      level: 3,
      approvers: [],
      notifications: [actorFromName("Initiator")],
    });
    const aligned = alignWorkflowLevels(tree, 1);
    assert.deepEqual(
      aligned.levels.map((level) => level.level),
      [1, 2, 3],
    );
    assert.equal(aligned.levels[1]?.approvers.length, 0);
    assert.equal(aligned.levels[2]?.notifications[0]?.name, "Initiator");
  });

  it("drops an empty level above the routing count", () => {
    const aligned = alignWorkflowLevels(emptyWorkflowTree("Leave", 2), 1);
    assert.deepEqual(
      aligned.levels.map((level) => level.level),
      [1],
    );
  });
});

describe("treeForSave", () => {
  it("removes steps past the routing count", () => {
    const tree = emptyWorkflowTree("Leave", 1);
    tree.levels.push({
      level: 2,
      approvers: [actorFromName("Reporting Authority")],
      notifications: [],
    });
    const saved = treeForSave(alignWorkflowLevels(tree, 1), 1);
    assert.deepEqual(
      saved.levels.map((level) => level.level),
      [1],
    );
    assert.equal(saved.notifyApproval.length, 0);
  });
});
