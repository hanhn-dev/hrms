import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { workItemStateColor, workItemTypeBorderColor, workItemTypeColor } from "./work-item-appearance.ts";

describe("work item chip colors", () => {
  it("uses a distinct color for each common type and state", () => {
    assert.equal(workItemTypeColor("Product Backlog Item"), "blue");
    assert.equal(workItemTypeColor("Task"), "green");
    assert.equal(workItemTypeColor("Bug"), "red");
    assert.equal(workItemTypeBorderColor("Product Backlog Item"), "#1677ff");
    assert.equal(workItemTypeBorderColor("Task"), "#52c41a");
    assert.equal(workItemTypeBorderColor("Bug"), "#ff4d4f");
    assert.notEqual(workItemTypeBorderColor("Task"), workItemTypeBorderColor("Bug"));
    assert.notEqual(workItemTypeColor("Task"), workItemTypeColor("Bug"));
    assert.equal(workItemStateColor("Committed"), "geekblue");
    assert.equal(workItemStateColor("In Progress"), "gold");
    assert.equal(workItemStateColor("Done"), "green");
    assert.notEqual(workItemStateColor("To Do"), workItemStateColor("Done"));
  });

  it("gives an uncommon type its own color", () => {
    assert.notEqual(workItemTypeColor("Test Suite"), workItemTypeColor("Shared Step"));
  });
});
