import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { WorkItemSummary } from "@hrms/azure-devops";
import type { PersonProgress } from "./aggregate-progress.ts";
import { cardIsStale, staleIdsForPerson } from "./progress-stale.ts";

function item(
  partial: Partial<WorkItemSummary> & Pick<WorkItemSummary, "id" | "state" | "type">,
): WorkItemSummary {
  return {
    title: `Item ${partial.id}`,
    assignedTo: null,
    tags: [],
    changedDate: null,
    iterationPath: "Team\\Sprint 1",
    parentId: null,
    hasDescription: false,
    hasAcceptanceCriteria: false,
    url: `https://example/${partial.id}`,
    ...partial,
  };
}

function person(displayName: string, activeItems: WorkItemSummary[]): PersonProgress {
  return {
    displayName,
    active: activeItems.length,
    completed: 0,
    total: activeItems.length,
    progressPercent: 0,
    stateCounts: {},
    activeItems,
    completedItems: [],
  };
}

describe("staleIdsForPerson", () => {
  const parent = item({
    id: 1,
    type: "Product Backlog Item",
    state: "Committed",
    assignedTo: "Alice",
  });
  const child = item({
    id: 2,
    type: "Task",
    state: "In Progress",
    assignedTo: "Bob",
    parentId: 1,
  });

  it("counts a stale child on the person who shows that card", () => {
    const alice = person("Alice", [parent]);
    assert.deepEqual(
      staleIdsForPerson(alice, [parent, child], new Map([[2, 5]])),
      [2],
    );
  });

  it("returns nothing when no ids are stale", () => {
    const alice = person("Alice", [parent]);
    assert.deepEqual(staleIdsForPerson(alice, [parent, child], new Map()), []);
  });
});

describe("cardIsStale", () => {
  it("is stale when a nested task is stale", () => {
    const tree = {
      item: item({ id: 1, type: "Product Backlog Item", state: "Committed" }),
      children: [item({ id: 2, type: "Task", state: "In Progress", parentId: 1 })],
      parent: null,
    };
    assert.equal(cardIsStale(tree, new Map([[2, 4]])), true);
    assert.equal(cardIsStale(tree, new Map()), false);
  });
});
