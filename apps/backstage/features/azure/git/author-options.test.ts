import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildAuthorOptions,
  filterTeamMembersByQuery,
  mergeTeamMembers,
  teamMembersFromNames,
} from "./author-options.ts";

describe("teamMembersFromNames", () => {
  it("dedupes display names case-insensitively", () => {
    assert.deepEqual(teamMembersFromNames(["Rajat Maurya", " rajat maurya ", ""]), [
      { id: "Rajat Maurya", displayName: "Rajat Maurya" },
    ]);
  });
});

describe("mergeTeamMembers", () => {
  it("keeps Azure ids when the same person is also on a local team", () => {
    assert.deepEqual(
      mergeTeamMembers(
        [{ id: "ado-1", displayName: "Hanh Nguyen" }],
        [
          { id: "Rajat Maurya", displayName: "Rajat Maurya" },
          { id: "Hanh Nguyen", displayName: "Hanh Nguyen" },
        ],
      ),
      [
        { id: "ado-1", displayName: "Hanh Nguyen" },
        { id: "Rajat Maurya", displayName: "Rajat Maurya" },
      ],
    );
  });
});

describe("filterTeamMembersByQuery", () => {
  it("returns nothing for short queries", () => {
    assert.deepEqual(
      filterTeamMembersByQuery([{ id: "1", displayName: "Rajat Maurya" }], "R"),
      [],
    );
  });

  it("matches local progress-team members by partial name", () => {
    assert.deepEqual(
      filterTeamMembersByQuery(
        [
          { id: "1", displayName: "Hanh Nguyen" },
          { id: "2", displayName: "Rajat Maurya" },
        ],
        "Rajat",
      ),
      [{ id: "2", displayName: "Rajat Maurya" }],
    );
  });
});

describe("buildAuthorOptions", () => {
  const roster = [
    { id: "1", displayName: "Hanh Nguyen" },
    { id: "2", displayName: "Amit Jadhav" },
    { id: "3", displayName: "  " },
  ];

  it("returns the sorted roster when the query is empty", () => {
    assert.deepEqual(
      buildAuthorOptions({
        roster,
        searchHits: [],
        selected: [],
        query: "",
      }),
      [
        { value: "Amit Jadhav", label: "Amit Jadhav" },
        { value: "Hanh Nguyen", label: "Hanh Nguyen" },
      ],
    );
  });

  it("does not filter the roster for a short query", () => {
    assert.deepEqual(
      buildAuthorOptions({
        roster,
        searchHits: [],
        selected: [],
        query: "R",
      }).map((option) => option.value),
      ["Amit Jadhav", "Hanh Nguyen"],
    );
  });

  it("filters the roster and merges identity hits when the query is long enough", () => {
    assert.deepEqual(
      buildAuthorOptions({
        roster: [...roster, { id: "local", displayName: "Rajat Maurya" }],
        searchHits: [],
        selected: [],
        query: "Rajat",
      }),
      [{ value: "Rajat Maurya", label: "Rajat Maurya" }],
    );
  });

  it("keeps selected authors even when they do not match the query", () => {
    assert.deepEqual(
      buildAuthorOptions({
        roster,
        searchHits: [{ id: "9", displayName: "Rajat Sharma" }],
        selected: ["Hanh Nguyen"],
        query: "Rajat",
      }).map((option) => option.value),
      ["Hanh Nguyen", "Rajat Sharma"],
    );
  });

  it("dedupes roster and search hits by display name", () => {
    assert.deepEqual(
      buildAuthorOptions({
        roster: [{ id: "1", displayName: "Rajat Sharma" }],
        searchHits: [{ id: "9", displayName: "Rajat Sharma" }],
        selected: ["Rajat Sharma"],
        query: "Rajat",
      }),
      [{ value: "Rajat Sharma", label: "Rajat Sharma" }],
    );
  });
});
