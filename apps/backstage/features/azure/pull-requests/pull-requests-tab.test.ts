import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  DEFAULT_PULL_REQUESTS_TAB,
  parsePullRequestsTab,
} from "./pull-requests-tab.ts";

describe("parsePullRequestsTab", () => {
  it("defaults to search", () => {
    assert.equal(parsePullRequestsTab(undefined), DEFAULT_PULL_REQUESTS_TAB);
    assert.equal(parsePullRequestsTab(""), "search");
    assert.equal(parsePullRequestsTab("search"), "search");
    assert.equal(parsePullRequestsTab("other"), "search");
  });

  it("accepts tracking", () => {
    assert.equal(parsePullRequestsTab("tracking"), "tracking");
    assert.equal(parsePullRequestsTab("Tracking"), "tracking");
  });
});
