import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { TeamIteration } from "@hrms/azure-devops";
import {
  filterIterations,
  iterationPathPrefixes,
  parentPathPrefixes,
} from "./filter-iterations.ts";

const sprints: TeamIteration[] = [
  {
    id: "1",
    name: "Sprint 1",
    path: "HRMS\\Release 2\\Sprint 1",
    timeFrame: "past",
    startDate: "2026-01-01T00:00:00.000Z",
    finishDate: "2026-01-14T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Sprint 2",
    path: "HRMS\\Release 2\\Sprint 2",
    timeFrame: "current",
    startDate: "2026-02-01T00:00:00.000Z",
    finishDate: "2026-02-14T00:00:00.000Z",
  },
  {
    id: "3",
    name: "Backlog",
    path: "HRMS\\Backlog",
    timeFrame: "future",
    startDate: null,
    finishDate: null,
  },
];

describe("parentPathPrefixes", () => {
  it("returns ancestors excluding the leaf", () => {
    assert.deepEqual(parentPathPrefixes("HRMS\\Release 2\\Sprint 1"), [
      "HRMS",
      "HRMS\\Release 2",
    ]);
  });

  it("returns nothing for a single-segment path", () => {
    assert.deepEqual(parentPathPrefixes("HRMS"), []);
    assert.deepEqual(parentPathPrefixes(""), []);
  });
});

describe("iterationPathPrefixes", () => {
  it("collects unique sorted prefixes", () => {
    assert.deepEqual(iterationPathPrefixes(sprints), ["HRMS", "HRMS\\Release 2"]);
  });
});

describe("filterIterations", () => {
  it("returns all rows when filters are empty", () => {
    assert.equal(filterIterations(sprints, {}).length, 3);
  });

  it("filters by name substring case-insensitively", () => {
    const result = filterIterations(sprints, { q: "sprint 2" });
    assert.deepEqual(
      result.map((row) => row.id),
      ["2"],
    );
  });

  it("filters by path prefix", () => {
    const result = filterIterations(sprints, { path: "HRMS\\Release 2" });
    assert.deepEqual(
      result.map((row) => row.id),
      ["1", "2"],
    );
  });

  it("keeps sprints that overlap the date range", () => {
    const result = filterIterations(sprints, {
      from: "2026-01-10",
      to: "2026-01-20",
    });
    assert.deepEqual(
      result.map((row) => row.id),
      ["1"],
    );
  });

  it("drops undated sprints when a date range is set", () => {
    const result = filterIterations(sprints, { from: "2026-01-01" });
    assert.ok(result.every((row) => row.id !== "3"));
  });

  it("combines name and path filters", () => {
    const result = filterIterations(sprints, {
      path: "HRMS\\Release 2",
      q: "Sprint 1",
    });
    assert.deepEqual(
      result.map((row) => row.id),
      ["1"],
    );
  });

  it("filters by time frame", () => {
    const result = filterIterations(sprints, { timeFrame: "past" });
    assert.deepEqual(
      result.map((row) => row.id),
      ["1"],
    );
  });
});
