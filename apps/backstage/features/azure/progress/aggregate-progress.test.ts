import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { TeamIteration, WorkItemSummary } from "@hrms/azure-devops";
import {
  UNASSIGNED_LABEL,
  buildPersonWorkTrees,
  buildVelocitySeries,
  collectStateColumns,
  filterMembers,
  filterVelocitySeries,
  groupByAssignee,
  isCompletedState,
  pickVelocityIterations,
  treeBoardState,
  treesByState,
} from "./aggregate-progress.ts";

function item(
  partial: Partial<WorkItemSummary> & Pick<WorkItemSummary, "id" | "state">,
): WorkItemSummary {
  return {
    title: `Item ${partial.id}`,
    type: "Task",
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

function iteration(
  partial: Partial<TeamIteration> & Pick<TeamIteration, "id" | "name" | "path" | "timeFrame">,
): TeamIteration {
  return {
    startDate: null,
    finishDate: null,
    ...partial,
  };
}

describe("isCompletedState", () => {
  it("treats Done, Closed, and Resolved as complete", () => {
    assert.equal(isCompletedState("Done"), true);
    assert.equal(isCompletedState("closed"), true);
    assert.equal(isCompletedState(" Resolved "), true);
    assert.equal(isCompletedState("In Progress"), false);
    assert.equal(isCompletedState(""), false);
  });
});

describe("groupByAssignee", () => {
  it("returns nothing for an empty sprint", () => {
    assert.deepEqual(groupByAssignee([]), []);
  });

  it("splits active and completed items and keeps roster order", () => {
    const rows = groupByAssignee(
      [
        item({ id: 1, state: "Done", assignedTo: "Alice" }),
        item({ id: 2, state: "In Progress", assignedTo: "Alice" }),
        item({ id: 3, state: "Closed", assignedTo: "Bob" }),
        item({ id: 4, state: "New", assignedTo: null }),
      ],
      ["Bob", "Alice"],
    );
    assert.equal(rows.length, 3);
    assert.equal(rows[0]?.displayName, "Bob");
    assert.equal(rows[0]?.completed, 1);
    assert.equal(rows[0]?.active, 0);
    assert.equal(rows[0]?.progressPercent, 100);
    assert.equal(rows[1]?.displayName, "Alice");
    assert.equal(rows[1]?.active, 1);
    assert.equal(rows[1]?.completed, 1);
    assert.equal(rows[1]?.progressPercent, 50);
    assert.deepEqual(rows[1]?.stateCounts, { Done: 1, "In Progress": 1 });
    assert.equal(rows[2]?.displayName, UNASSIGNED_LABEL);
    assert.equal(rows[2]?.active, 1);
  });

  it("orders status columns from known sprint states", () => {
    const rows = groupByAssignee([
      item({ id: 1, state: "Done", assignedTo: "Alice" }),
      item({ id: 2, state: "In Progress", assignedTo: "Alice" }),
      item({ id: 3, state: "New", assignedTo: "Alice" }),
      item({ id: 4, state: "Custom QA", assignedTo: "Alice" }),
    ]);
    assert.deepEqual(collectStateColumns(rows), [
      "New",
      "In Progress",
      "Done",
      "Custom QA",
    ]);
  });

  it("omits Removed and Design columns", () => {
    const rows = groupByAssignee([
      item({ id: 1, state: "Done", assignedTo: "Alice" }),
      item({ id: 2, state: "Removed", assignedTo: "Alice" }),
      item({ id: 3, state: "Design", assignedTo: "Alice" }),
    ]);
    assert.deepEqual(collectStateColumns(rows), ["Done"]);
  });

  it("keeps roster members with zero items", () => {
    const rows = groupByAssignee([], ["Carol"]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.displayName, "Carol");
    assert.equal(rows[0]?.total, 0);
    assert.equal(rows[0]?.progressPercent, 0);
  });
});

describe("filterMembers", () => {
  it("keeps the full list when nothing is selected", () => {
    const rows = groupByAssignee([
      item({ id: 1, state: "Done", assignedTo: "Alice" }),
      item({ id: 2, state: "New", assignedTo: null }),
    ]);
    assert.equal(filterMembers(rows, []).length, 2);
  });

  it("keeps selection order and drops Unassigned while filtering", () => {
    const rows = groupByAssignee(
      [
        item({ id: 1, state: "Done", assignedTo: "Alice" }),
        item({ id: 2, state: "Done", assignedTo: "Bob" }),
        item({ id: 3, state: "New", assignedTo: null }),
      ],
      ["Alice", "Bob"],
    );
    const filtered = filterMembers(rows, ["Bob", "Alice", "Bob"]);
    assert.deepEqual(
      filtered.map((row) => row.displayName),
      ["Bob", "Alice"],
    );
  });

  it("inserts an empty row for a selected member with no work", () => {
    const filtered = filterMembers([], ["Dana"]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.displayName, "Dana");
    assert.equal(filtered[0]?.total, 0);
  });
});

describe("pickVelocityIterations", () => {
  it("returns past sprints oldest-first then current", () => {
    const picked = pickVelocityIterations([
      iteration({ id: "c", name: "Now", path: "Now", timeFrame: "current" }),
      iteration({ id: "p1", name: "P1", path: "P1", timeFrame: "past" }),
      iteration({ id: "p2", name: "P2", path: "P2", timeFrame: "past" }),
      iteration({ id: "f", name: "Next", path: "Next", timeFrame: "future" }),
    ]);
    assert.deepEqual(
      picked.map((item) => item.path),
      ["P2", "P1", "Now"],
    );
  });
});

describe("buildPersonWorkTrees", () => {
  it("nests tasks and bugs under a person PBI and hides them as roots", () => {
    const pbi = item({
      id: 10,
      state: "Committed",
      type: "Product Backlog Item",
      assignedTo: "Alice",
      title: "Parent",
    });
    const task = item({
      id: 11,
      state: "In Progress",
      type: "Task",
      assignedTo: "Alice",
      parentId: 10,
      title: "Child task",
    });
    const bug = item({
      id: 12,
      state: "New",
      type: "Bug",
      assignedTo: "Alice",
      parentId: 10,
      title: "Child bug",
    });
    const trees = buildPersonWorkTrees([pbi, task, bug], [pbi, task, bug]);
    assert.equal(trees.length, 1);
    assert.equal(trees[0]?.item.id, 10);
    assert.deepEqual(
      trees[0]?.children.map((child) => child.id),
      [11, 12],
    );
  });

  it("wraps a person's tasks under a PBI assigned to someone else", () => {
    const pbi = item({
      id: 20,
      state: "Committed",
      type: "Product Backlog Item",
      assignedTo: "Bob",
      title: "Shared parent",
    });
    const aliceTask = item({
      id: 21,
      state: "In Progress",
      type: "Task",
      assignedTo: "Alice",
      parentId: 20,
      title: "Alice task",
    });
    const bobTask = item({
      id: 22,
      state: "Done",
      type: "Task",
      assignedTo: "Bob",
      parentId: 20,
      title: "Bob task",
    });
    const aliceTrees = buildPersonWorkTrees([aliceTask], [pbi, aliceTask, bobTask]);
    assert.equal(aliceTrees.length, 1);
    assert.equal(aliceTrees[0]?.item.id, 20);
    assert.equal(aliceTrees[0]?.parent, null);
    assert.deepEqual(
      aliceTrees[0]?.children.map((child) => child.id),
      [21],
    );

    const bobTrees = buildPersonWorkTrees([pbi, bobTask], [pbi, aliceTask, bobTask]);
    assert.equal(bobTrees.length, 1);
    assert.equal(bobTrees[0]?.item.id, 20);
    assert.deepEqual(
      bobTrees[0]?.children.map((child) => child.id),
      [21, 22],
    );
  });

  it("keeps a task as a root with a parent stub when the PBI is missing from the sprint set", () => {
    const task = item({
      id: 21,
      state: "In Progress",
      type: "Task",
      assignedTo: "Alice",
      parentId: 20,
      title: "Alice task",
    });
    const trees = buildPersonWorkTrees([task], [task]);
    assert.equal(trees.length, 1);
    assert.equal(trees[0]?.item.id, 21);
    assert.equal(trees[0]?.parent, null);
    assert.equal(trees[0]?.children.length, 0);
  });
});

describe("treeBoardState", () => {
  it("uses the root state when there are no children", () => {
    assert.equal(
      treeBoardState({
        item: item({ id: 1, state: "Committed", type: "Task" }),
        children: [],
        parent: null,
      }),
      "Committed",
    );
  });

  it("places a Committed PBI under In Progress when a child task is active", () => {
    const tree = {
      item: item({
        id: 10,
        state: "Committed",
        type: "Product Backlog Item",
      }),
      children: [
        item({ id: 11, state: "Done", type: "Task" }),
        item({ id: 12, state: "In Progress", type: "Task" }),
      ],
      parent: null,
    };
    assert.equal(treeBoardState(tree), "In Progress");
    const grouped = treesByState([tree]);
    assert.equal(grouped.get("In Progress")?.length, 1);
    assert.equal(grouped.get("Committed"), undefined);
  });

  it("uses the furthest completed child state when every child is done", () => {
    assert.equal(
      treeBoardState({
        item: item({
          id: 10,
          state: "Committed",
          type: "Product Backlog Item",
        }),
        children: [
          item({ id: 11, state: "Done", type: "Task" }),
          item({ id: 12, state: "Closed", type: "Task" }),
        ],
        parent: null,
      }),
      "Closed",
    );
  });
});

describe("buildVelocitySeries", () => {
  it("builds a member × sprint completed matrix", () => {
    const iterations = [
      iteration({ id: "c", name: "Now", path: "Now", timeFrame: "current" }),
      iteration({ id: "p1", name: "P1", path: "P1", timeFrame: "past" }),
    ];
    const itemsByPath = new Map<string, WorkItemSummary[]>([
      [
        "P1",
        [
          item({ id: 1, state: "Done", assignedTo: "Alice", iterationPath: "P1" }),
          item({ id: 2, state: "Done", assignedTo: "Alice", iterationPath: "P1" }),
          item({ id: 3, state: "In Progress", assignedTo: "Bob", iterationPath: "P1" }),
        ],
      ],
      [
        "Now",
        [
          item({ id: 4, state: "Closed", assignedTo: "Bob", iterationPath: "Now" }),
          item({ id: 5, state: "Done", assignedTo: "Alice", iterationPath: "Now" }),
        ],
      ],
    ]);
    const series = buildVelocitySeries(iterations, itemsByPath, ["Alice", "Bob"]);
    assert.deepEqual(
      series.iterations.map((entry) => entry.path),
      ["P1", "Now"],
    );
    assert.deepEqual(series.members, ["Alice", "Bob"]);
    assert.equal(series.counts.get("Alice")?.get("P1"), 2);
    assert.equal(series.counts.get("Alice")?.get("Now"), 1);
    assert.equal(series.counts.get("Bob")?.get("P1"), 0);
    assert.equal(series.counts.get("Bob")?.get("Now"), 1);
  });
});

describe("filterVelocitySeries", () => {
  it("returns the series unchanged when nothing is selected", () => {
    const series = buildVelocitySeries(
      [iteration({ id: "c", name: "Now", path: "Now", timeFrame: "current" })],
      new Map([
        ["Now", [item({ id: 1, state: "Done", assignedTo: "Alice", iterationPath: "Now" })]],
      ]),
      ["Alice", "Bob"],
    );
    assert.equal(filterVelocitySeries(series, []), series);
  });

  it("keeps selection order and zero-fills missing members", () => {
    const series = buildVelocitySeries(
      [
        iteration({ id: "c", name: "Now", path: "Now", timeFrame: "current" }),
        iteration({ id: "p1", name: "P1", path: "P1", timeFrame: "past" }),
      ],
      new Map([
        [
          "P1",
          [item({ id: 1, state: "Done", assignedTo: "Alice", iterationPath: "P1" })],
        ],
        [
          "Now",
          [item({ id: 2, state: "Closed", assignedTo: "Bob", iterationPath: "Now" })],
        ],
      ]),
      ["Alice", "Bob"],
    );
    const filtered = filterVelocitySeries(series, ["Bob", "Dana", "Bob"]);
    assert.deepEqual(filtered.members, ["Bob", "Dana"]);
    assert.equal(filtered.counts.get("Bob")?.get("Now"), 1);
    assert.equal(filtered.counts.get("Dana")?.get("Now"), 0);
    assert.equal(filtered.counts.get("Dana")?.get("P1"), 0);
    assert.equal(filtered.cells.length, 4);
  });
});
