import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { WorkItemSummary } from "@hrms/azure-devops";
import { summarizeSprintTrees } from "./sprint-summary.ts";

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

describe("summarizeSprintTrees", () => {
  it("counts PBIs, bugs, features and totals effort", () => {
    const summary = summarizeSprintTrees([
      {
        item: item({
          id: 1,
          title: "PBI with effort",
          type: "Product Backlog Item",
          effort: 5,
        }),
        children: [item({ id: 2, title: "Nested bug", type: "Bug", parentId: 1 })],
        parent: null,
      },
      {
        item: item({ id: 3, title: "Feature", type: "Feature", effort: 3 }),
        children: [],
        parent: null,
      },
      {
        item: item({ id: 4, title: "Lone bug", type: "Bug", effort: 2 }),
        children: [],
        parent: null,
      },
    ]);

    assert.deepEqual(summary, {
      pbiCount: 1,
      bugCount: 2,
      featureCount: 1,
      totalEffort: 10,
      missingEffort: [],
    });
  });

  it("lists PBIs and standalone bugs that have no effort", () => {
    const summary = summarizeSprintTrees([
      {
        item: item({
          id: 10,
          title: "Missing PBI",
          type: "Product Backlog Item",
          assignedTo: "Alex",
        }),
        children: [],
        parent: null,
      },
      {
        item: item({ id: 11, title: "Missing bug", type: "Bug" }),
        children: [],
        parent: null,
      },
      {
        item: item({
          id: 12,
          title: "Ready PBI",
          type: "Product Backlog Item",
          effort: 8,
        }),
        children: [],
        parent: null,
      },
    ]);

    assert.equal(summary.totalEffort, 8);
    assert.deepEqual(
      summary.missingEffort.map((entry) => entry.id),
      [10, 11],
    );
    assert.equal(summary.missingEffort[0]?.assignedTo, "Alex");
  });

  it("treats zero effort as missing", () => {
    const summary = summarizeSprintTrees([
      {
        item: item({
          id: 1,
          title: "Zero",
          type: "Product Backlog Item",
          effort: 0,
        }),
        children: [],
        parent: null,
      },
    ]);
    assert.equal(summary.totalEffort, 0);
    assert.equal(summary.missingEffort.length, 1);
  });
});
