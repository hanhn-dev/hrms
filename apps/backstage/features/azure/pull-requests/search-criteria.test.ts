import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { emptyPullRequestSearchCriteria } from "@hrms/azure-devops/criteria";
import { canSearchPullRequests } from "./search-criteria";

describe("canSearchPullRequests", () => {
  it("rejects an empty form", () => {
    const empty = emptyPullRequestSearchCriteria();
    assert.equal(empty.dateField, "merged");
    assert.equal(canSearchPullRequests(empty), false);
  });

  it("accepts one filled control and ignores the date field on its own", () => {
    const empty = emptyPullRequestSearchCriteria();
    assert.equal(canSearchPullRequests({ ...empty, workItemIds: "101" }), true);
    assert.equal(canSearchPullRequests({ ...empty, areaPaths: ["TDG HRMS\\Ganges\\COB"] }), true);
    assert.equal(canSearchPullRequests({ ...empty, authorIds: ["alice"] }), true);
    assert.equal(canSearchPullRequests({ ...empty, dateFrom: "2026-10-01" }), true);
    assert.equal(canSearchPullRequests({ ...empty, dateField: "opened" }), false);
  });
});
