import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  boardHref,
  iterationLeafName,
  sprintHref,
  sprintsClearHref,
} from "./sprint-links.ts";

describe("iterationLeafName", () => {
  it("returns the last path segment", () => {
    assert.equal(iterationLeafName("TDG HRMS\\Release\\Sprint 64"), "Sprint 64");
    assert.equal(iterationLeafName("Sprint 1"), "Sprint 1");
  });

  it("returns the input when empty", () => {
    assert.equal(iterationLeafName(""), "");
  });
});

describe("boardHref", () => {
  it("includes team and iteration", () => {
    assert.equal(
      boardHref("TDG\\Sprint 1", "Team Sprinter"),
      "/azure/board?team=Team+Sprinter&iteration=TDG%5CSprint+1",
    );
  });
});

describe("sprintHref", () => {
  it("sets iteration and keeps filters", () => {
    assert.equal(
      sprintHref("TDG\\Sprint 1", { team: "Other", timeFrame: "current" }),
      "/azure/sprints?team=Other&timeFrame=current&iteration=TDG%5CSprint+1",
    );
  });
});

describe("sprintsClearHref", () => {
  it("drops iteration and keeps filters", () => {
    assert.equal(
      sprintsClearHref({ team: "Other", q: "login" }),
      "/azure/sprints?team=Other&q=login",
    );
  });

  it("returns the bare sprints path when filters are empty", () => {
    assert.equal(sprintsClearHref({}), "/azure/sprints");
    assert.equal(sprintsClearHref(), "/azure/sprints");
  });
});
