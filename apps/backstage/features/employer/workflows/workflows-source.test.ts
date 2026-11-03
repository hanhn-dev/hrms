import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseWorkflowDetailTab, workflowHref } from "./workflows-source.ts";

describe("parseWorkflowDetailTab", () => {
  it("defaults to details", () => {
    assert.equal(parseWorkflowDetailTab(undefined), "details");
    assert.equal(parseWorkflowDetailTab(""), "details");
    assert.equal(parseWorkflowDetailTab("pages"), "details");
  });

  it("accepts the approval tree tab", () => {
    assert.equal(parseWorkflowDetailTab("tree"), "tree");
    assert.equal(parseWorkflowDetailTab("details"), "details");
  });
});

describe("workflowHref", () => {
  it("omits the query for the default tab", () => {
    assert.equal(workflowHref(4, 9), "/employers/4/workflows/9");
    assert.equal(workflowHref(4, 9, "details"), "/employers/4/workflows/9");
    assert.equal(workflowHref(4, "new"), "/employers/4/workflows/new");
  });

  it("adds the tree tab", () => {
    assert.equal(workflowHref(4, 9, "tree"), "/employers/4/workflows/9?tab=tree");
  });
});
