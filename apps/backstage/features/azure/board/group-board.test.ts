import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { WorkItemSummary } from "@hrms/azure-devops";
import { groupBoard, sprintSummary, UNMAPPED_COLUMN_ID } from "./group-board.ts";

function item(
  partial: Pick<WorkItemSummary, "id" | "title" | "type"> & Partial<WorkItemSummary>,
): WorkItemSummary {
  return {
    state: "Active",
    assignedTo: null,
    tags: [],
    changedDate: null,
    iterationPath: "TDG HRMS\\Team Sprinter\\Sprint",
    parentId: null,
    hasDescription: false,
    hasAcceptanceCriteria: false,
    url: `https://dev.azure.com/org/_workitems/edit/${partial.id}`,
    ...partial,
  };
}

const columns = [
  { id: "doing", name: "Doing", order: 1, mappings: [] },
  {
    id: "todo",
    name: "To Do",
    order: 0,
    mappings: [{ workItemType: "Task", state: "New" }],
  },
];

describe("groupBoard", () => {
  it("rolls tasks and bugs under a parent PBI and leaves outside parents alone", () => {
    const model = groupBoard({
      workItems: [
        item({ id: 10, title: "Login", type: "Product Backlog Item", assignedTo: "Sam" }),
        item({ id: 11, title: "API", type: "Task", parentId: 10, assignedTo: "Alex" }),
        item({ id: 12, title: "Copy", type: "Bug", parentId: 10, assignedTo: "Alex" }),
        item({ id: 13, title: "Orphan", type: "Task", parentId: 99, assignedTo: "Alex" }),
      ],
      columns,
      placements: [],
      members: [],
    });

    const api = model.columns.at(-1)?.cards.find((card) => card.item.id === 11);
    const orphan = model.columns.at(-1)?.cards.find((card) => card.item.id === 13);
    assert.equal(api?.parentTitle, "Login");
    assert.equal(orphan?.parentTitle, null);
    assert.equal(model.columns.at(-1)?.id, UNMAPPED_COLUMN_ID);
  });

  it("counts a person on a PBI when they own the PBI or a child task", () => {
    const model = groupBoard({
      workItems: [
        item({ id: 10, title: "Login", type: "Product Backlog Item", assignedTo: "Sam" }),
        item({ id: 11, title: "API", type: "Task", parentId: 10, assignedTo: "Alex" }),
        item({ id: 20, title: "Reports", type: "Product Backlog Item", assignedTo: "Alex" }),
      ],
      columns,
      placements: [
        { workItemId: 11, columnId: "doing" },
        { workItemId: 20, columnId: "todo" },
      ],
      members: [{ id: "1", displayName: "Alex" }],
      assignees: ["alex"],
    });

    assert.deepEqual(
      model.memberAnswers[0]?.pbis.map((pbi) => pbi.id),
      [10, 20],
    );
    assert.equal(model.memberAnswers[0]?.displayName, "Alex");
    assert.deepEqual(
      model.columns.flatMap((column) => column.cards).map((card) => card.item.id),
      [20, 11],
    );
    assert.equal(model.people[0]?.displayName, "Alex");
  });

  it("matches every search word against id, title, assignee, and parent title", () => {
    const workItems = [
      item({ id: 10, title: "Login page", type: "Product Backlog Item", assignedTo: "Sam" }),
      item({ id: 1201, title: "API", type: "Task", parentId: 10, assignedTo: "Alex" }),
      item({ id: 30, title: "Other", type: "Task", assignedTo: "Alex" }),
    ];
    const base = { workItems, columns, placements: [], members: [] };

    const byParent = groupBoard({ ...base, query: "login" });
    assert.deepEqual(
      byParent.columns.flatMap((column) => column.cards).map((card) => card.item.id),
      [10, 1201],
    );

    const byIdAndTitle = groupBoard({ ...base, query: "1201 api" });
    assert.deepEqual(
      byIdAndTitle.columns.flatMap((column) => column.cards).map((card) => card.item.id),
      [1201],
    );

    const shortToken = groupBoard({ ...base, query: "a" });
    assert.equal(shortToken.columns.flatMap((column) => column.cards).length, 3);

    const empty = groupBoard({ ...base, query: "   " });
    assert.equal(empty.columns.flatMap((column) => column.cards).length, 3);
  });

  it("sorts columns by order and puts missing placements in Unmapped", () => {
    const model = groupBoard({
      workItems: [
        item({ id: 1, title: "Known", type: "Task" }),
        item({ id: 2, title: "Missing", type: "Task" }),
        item({ id: 3, title: "Unknown column", type: "Task" }),
      ],
      columns,
      placements: [
        { workItemId: 1, columnId: "doing" },
        { workItemId: 3, columnId: "gone" },
      ],
      members: [],
    });

    assert.deepEqual(
      model.columns.map((column) => column.id),
      ["todo", "doing", UNMAPPED_COLUMN_ID],
    );
    assert.deepEqual(
      model.columns.find((column) => column.id === "doing")?.cards.map((card) => card.item.id),
      [1],
    );
    assert.deepEqual(
      model.columns.at(-1)?.cards.map((card) => card.item.id),
      [2, 3],
    );
  });

  it("places an item by the column state mapping when the board has no per-item column", () => {
    const model = groupBoard({
      workItems: [item({ id: 4, title: "Fresh", type: "Task", state: "New" })],
      columns,
      placements: [],
      members: [],
    });

    assert.deepEqual(
      model.columns.find((column) => column.id === "todo")?.cards.map((card) => card.item.id),
      [4],
    );
  });

  it("groups by work item state when the team has no taskboard columns", () => {
    const model = groupBoard({
      workItems: [
        item({ id: 1, title: "Later", type: "Task", state: "In Progress" }),
        item({ id: 2, title: "First", type: "Product Backlog Item", state: "Committed" }),
        item({ id: 3, title: "Custom", type: "Task", state: "Blocked" }),
      ],
      columns: [],
      placements: [],
      members: [],
    });

    assert.deepEqual(
      model.columns.map((column) => column.name),
      ["Committed", "In Progress", "Blocked"],
    );
    assert.deepEqual(
      model.columns.find((column) => column.name === "Committed")?.cards.map((card) => card.item.id),
      [2],
    );
  });

  it("returns empty columns and no people when there is no work", () => {
    const model = groupBoard({
      workItems: [],
      columns,
      placements: [],
      members: [{ id: "1", displayName: "Alex" }],
      assignees: ["Alex"],
      query: "login",
    });

    assert.deepEqual(
      model.columns.map((column) => column.id),
      ["todo", "doing"],
    );
    assert.deepEqual(model.people, []);
    assert.deepEqual(model.memberAnswers, [{ displayName: "Alex", pbis: [] }]);
  });

  it("keeps cards for every selected assignee and work item type", () => {
    const model = groupBoard({
      workItems: [
        item({ id: 10, title: "Login", type: "Product Backlog Item", assignedTo: "Sam" }),
        item({ id: 11, title: "API", type: "Task", parentId: 10, assignedTo: "Alex" }),
        item({ id: 12, title: "Copy", type: "Bug", parentId: 10, assignedTo: "Sam" }),
      ],
      columns,
      placements: [],
      members: [],
      assignees: ["Alex", "Sam"],
      types: ["Bug", "Task"],
    });

    assert.deepEqual(
      model.columns.flatMap((column) => column.cards).map((card) => card.item.id),
      [11, 12],
    );
  });

  it("attaches child tasks to the parent card and keeps an outside parent id", () => {
    const model = groupBoard({
      workItems: [
        item({ id: 10, title: "Login", type: "Product Backlog Item", state: "Committed" }),
        item({ id: 11, title: "API", type: "Task", parentId: 10, state: "To Do" }),
        item({ id: 12, title: "Copy", type: "Bug", parentId: 10, state: "Done" }),
        item({ id: 13, title: "Orphan", type: "Task", parentId: 99 }),
      ],
      columns: [],
      placements: [],
      members: [],
    });

    const cards = model.columns.flatMap((column) => column.cards);
    const parent = cards.find((card) => card.item.id === 10);
    const orphan = cards.find((card) => card.item.id === 13);
    assert.deepEqual(
      parent?.children.map((child) => child.id),
      [11, 12],
    );
    assert.equal(parent?.children[0]?.columnName, "To Do");
    assert.equal(orphan?.parent?.id, 99);
    assert.equal(orphan?.parent?.title, null);
    assert.equal(orphan?.parentTitle, null);
  });

  it("shows a parent that is outside the sprint without adding it as a card", () => {
    const model = groupBoard({
      workItems: [item({ id: 11, title: "API", type: "Task", parentId: 10, state: "To Do" })],
      columns: [],
      placements: [],
      members: [],
      parents: [
        item({
          id: 10,
          title: "Bulk profile update",
          type: "Product Backlog Item",
          state: "Committed",
          assignedTo: "Nakeeb Raut",
        }),
      ],
    });

    const task = model.columns.flatMap((column) => column.cards).find((card) => card.item.id === 11);
    assert.equal(task?.parent?.title, "Bulk profile update");
    assert.equal(task?.parent?.state, "Committed");
    assert.equal(task?.parent?.assignedTo, "Nakeeb Raut");
    assert.equal(
      model.columns.flatMap((column) => column.cards).some((card) => card.item.id === 10),
      false,
    );
  });

  it("counts work items, tasks, bugs, and product backlog items in the sprint", () => {
    assert.deepEqual(
      sprintSummary([
        item({ id: 1, title: "Login", type: "Product Backlog Item" }),
        item({ id: 2, title: "API", type: "Task" }),
        item({ id: 3, title: "Copy", type: "Bug" }),
        item({ id: 4, title: "Suite", type: "Test Suite" }),
      ]),
      { total: 4, tasks: 1, bugs: 1, pbis: 1, other: 1 },
    );
  });
});
