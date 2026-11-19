import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { WorkItemSummary } from "@hrms/azure-devops";
import {
  buildSprintWorkItemTrees,
  isSprintChildType,
  isSprintParentType,
} from "./sprint-work-item-tree.ts";

function item(
  partial: Partial<WorkItemSummary> & Pick<WorkItemSummary, "id" | "title" | "type">,
): WorkItemSummary {
  return {
    state: "New",
    assignedTo: null,
    tags: [],
    changedDate: null,
    iterationPath: "Team\\Sprint 1",
    parentId: null,
    effort: null,
    hasDescription: false,
    hasAcceptanceCriteria: false,
    url: `https://dev.azure.com/_workitems/edit/${partial.id}`,
    ...partial,
  };
}

describe("isSprintParentType / isSprintChildType", () => {
  it("treats bugs as nested children and excludes tasks", () => {
    assert.equal(isSprintParentType("Product Backlog Item"), true);
    assert.equal(isSprintParentType("Feature"), true);
    assert.equal(isSprintParentType("Task"), false);
    assert.equal(isSprintChildType("Bug"), true);
    assert.equal(isSprintChildType("Task"), false);
    assert.equal(isSprintChildType("Product Backlog Item"), false);
  });
});

describe("buildSprintWorkItemTrees", () => {
  it("nests bugs under their PBI and omits tasks", () => {
    const trees = buildSprintWorkItemTrees([
      item({ id: 10, title: "Parent PBI", type: "Product Backlog Item" }),
      item({ id: 11, title: "Child task", type: "Task", parentId: 10 }),
      item({ id: 12, title: "Child bug", type: "Bug", parentId: 10 }),
      item({ id: 20, title: "Lone bug", type: "Bug" }),
    ]);

    assert.equal(trees.length, 2);
    assert.equal(trees[0]?.item.id, 10);
    assert.deepEqual(
      trees[0]?.children.map((child) => child.id),
      [12],
    );
    assert.equal(trees[1]?.item.id, 20);
    assert.deepEqual(trees[1]?.children, []);
  });

  it("does not create a card for tasks alone", () => {
    const trees = buildSprintWorkItemTrees([
      item({ id: 11, title: "Orphan task", type: "Task", parentId: 99 }),
    ]);
    assert.deepEqual(trees, []);
  });

  it("keeps a bug as its own card when the parent PBI is not in the sprint set", () => {
    const trees = buildSprintWorkItemTrees([
      item({ id: 12, title: "Orphan bug", type: "Bug", parentId: 99 }),
    ]);
    assert.equal(trees.length, 1);
    assert.equal(trees[0]?.item.id, 12);
    assert.equal(trees[0]?.parent, null);
  });
});
