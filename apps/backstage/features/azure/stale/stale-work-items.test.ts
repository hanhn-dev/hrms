import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { WorkItemStateAge, WorkItemSummary } from "@hrms/azure-devops";
import {
  buildReminderText,
  collectActiveWorkItemIds,
  findStaleWorkItems,
  groupStaleByAssignee,
} from "./stale-work-items.ts";

function item(
  partial: Partial<WorkItemSummary> & Pick<WorkItemSummary, "id" | "title" | "state">,
): WorkItemSummary {
  return {
    type: "Task",
    assignedTo: null,
    tags: [],
    changedDate: null,
    iterationPath: "Sprint 1",
    parentId: null,
    hasDescription: false,
    hasAcceptanceCriteria: false,
    url: `https://example/${partial.id}`,
    ...partial,
  };
}

function age(workItemId: number, daysInState: number | null): WorkItemStateAge {
  return {
    workItemId,
    stateEnteredAt: daysInState == null ? null : "2026-01-01T00:00:00Z",
    daysInState,
  };
}

describe("collectActiveWorkItemIds", () => {
  it("skips completed states and dedupes", () => {
    assert.deepEqual(
      collectActiveWorkItemIds([
        item({ id: 1, title: "A", state: "Active" }),
        item({ id: 2, title: "B", state: "Done" }),
        item({ id: 1, title: "A", state: "Active" }),
        item({ id: 3, title: "C", state: "Closed" }),
      ]),
      [1],
    );
  });
});

describe("findStaleWorkItems", () => {
  it("flags items at or over the threshold and always includes Blocked", () => {
    const items = [
      item({ id: 1, title: "Old", state: "In Progress", assignedTo: "Pat" }),
      item({ id: 2, title: "Fresh", state: "Active", assignedTo: "Pat" }),
      item({ id: 3, title: "Stop", state: "Blocked", assignedTo: "Sam" }),
      item({ id: 4, title: "Done", state: "Done", assignedTo: "Pat" }),
    ];
    const ages = new Map([
      [1, age(1, 5)],
      [2, age(2, 1)],
      [3, age(3, 0)],
      [4, age(4, 20)],
    ]);

    const stale = findStaleWorkItems(items, ages, 3);
    assert.deepEqual(
      stale.map((entry) => ({ id: entry.item.id, reason: entry.reason })),
      [
        { id: 1, reason: "stale" },
        { id: 3, reason: "blocked" },
      ],
    );
  });

  it("treats the threshold boundary as stale", () => {
    const items = [item({ id: 9, title: "Edge", state: "Active", assignedTo: "Pat" })];
    const ages = new Map([[9, age(9, 3)]]);
    assert.equal(findStaleWorkItems(items, ages, 3)[0]?.item.id, 9);
  });
});

describe("group and reminder", () => {
  it("groups by assignee and builds reminder text", () => {
    const stale = findStaleWorkItems(
      [
        item({ id: 1, title: "A", state: "Active", assignedTo: "Pat" }),
        item({ id: 2, title: "B", state: "Blocked", assignedTo: "Pat" }),
        item({ id: 3, title: "C", state: "Active", assignedTo: null }),
      ],
      new Map([
        [1, age(1, 4)],
        [2, age(2, 1)],
        [3, age(3, 6)],
      ]),
      3,
    );
    const groups = groupStaleByAssignee(stale);
    assert.deepEqual(
      groups.map((group) => group.assignee),
      ["Pat", "Unassigned"],
    );
    assert.match(
      buildReminderText(groups[0]!),
      /Hi Pat — please update or move these items still in the same status: #1 \(Active, 4d\), #2 \(Blocked, 1d\)/,
    );
  });
});
