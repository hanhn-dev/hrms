import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PullRequestCandidate } from "@hrms/azure-devops";
import {
  aggregatePullRequestsByMember,
  filterPullRequestMembers,
  summarizeTeamPullRequests,
  toDateOnly,
} from "./aggregate-pull-requests.ts";

function candidate(
  partial: Partial<PullRequestCandidate> &
    Pick<PullRequestCandidate, "pullRequestId" | "status">,
): PullRequestCandidate {
  return {
    repositoryId: "repo",
    repositoryName: "HRMS",
    title: `PR ${partial.pullRequestId}`,
    author: null,
    authorId: null,
    sourceBranch: "refs/heads/feature",
    targetBranch: "refs/heads/main",
    openedDate: "2026-10-01T12:00:00.000Z",
    mergedDate: null,
    url: `https://example/pr/${partial.pullRequestId}`,
    hashes: { mergeCommit: null, sourceCommit: null, targetCommit: null },
    relatedWorkItemIds: [],
    requestedWorkItemIds: [],
    childWorkItemIds: [],
    ...partial,
  };
}

describe("aggregatePullRequestsByMember", () => {
  it("returns empty rows for an empty roster", () => {
    assert.deepEqual(aggregatePullRequestsByMember([], []), []);
  });

  it("keeps roster order and zero counts when there are no PRs", () => {
    const rows = aggregatePullRequestsByMember(
      [
        { displayName: "Alice", authorId: "alice-id" },
        { displayName: "Bob", authorId: "bob-id" },
      ],
      [],
    );
    assert.deepEqual(
      rows.map((row) => ({
        displayName: row.displayName,
        opened: row.opened,
        authorId: row.authorId,
      })),
      [
        { displayName: "Alice", opened: 0, authorId: "alice-id" },
        { displayName: "Bob", opened: 0, authorId: "bob-id" },
      ],
    );
  });

  it("groups by authorId and tallies status counts", () => {
    const rows = aggregatePullRequestsByMember(
      [
        { displayName: "Alice", authorId: "alice-id" },
        { displayName: "Bob", authorId: "bob-id" },
      ],
      [
        candidate({
          pullRequestId: 1,
          authorId: "alice-id",
          author: "Alice",
          status: "active",
          openedDate: "2026-10-05T00:00:00.000Z",
        }),
        candidate({
          pullRequestId: 2,
          authorId: "alice-id",
          author: "Alice",
          status: "completed",
          openedDate: "2026-10-08T00:00:00.000Z",
        }),
        candidate({
          pullRequestId: 3,
          authorId: "bob-id",
          author: "Bob",
          status: "abandoned",
          openedDate: "2026-10-03T00:00:00.000Z",
        }),
      ],
    );

    assert.equal(rows[0]?.opened, 2);
    assert.deepEqual(rows[0]?.byStatus, { active: 1, completed: 1, abandoned: 0 });
    assert.deepEqual(
      rows[0]?.pullRequests.map((pr) => pr.pullRequestId),
      [2, 1],
    );
    assert.equal(rows[1]?.opened, 1);
    assert.deepEqual(rows[1]?.byStatus, { active: 0, completed: 0, abandoned: 1 });
  });

  it("falls back to displayName when authorId is missing on the roster", () => {
    const rows = aggregatePullRequestsByMember(
      [{ displayName: "Alice", authorId: null }],
      [
        candidate({
          pullRequestId: 9,
          author: "Alice",
          authorId: "alice-id",
          status: "active",
        }),
      ],
    );
    assert.equal(rows[0]?.opened, 1);
  });

  it("matches display names case-insensitively", () => {
    const rows = aggregatePullRequestsByMember(
      [{ displayName: "Hanh Nguyen", authorId: null }],
      [
        candidate({
          pullRequestId: 11,
          author: "hanh nguyen",
          authorId: "other-id",
          status: "completed",
        }),
      ],
    );
    assert.equal(rows[0]?.opened, 1);
  });

  it("ignores candidates that do not match the roster", () => {
    const rows = aggregatePullRequestsByMember(
      [{ displayName: "Alice", authorId: "alice-id" }],
      [
        candidate({
          pullRequestId: 4,
          authorId: "carol-id",
          author: "Carol",
          status: "active",
        }),
      ],
    );
    assert.equal(rows[0]?.opened, 0);
  });
});

describe("summarizeTeamPullRequests", () => {
  it("sums opened and status counts across members", () => {
    const rows = aggregatePullRequestsByMember(
      [
        { displayName: "Alice", authorId: "alice-id" },
        { displayName: "Bob", authorId: "bob-id" },
      ],
      [
        candidate({ pullRequestId: 1, authorId: "alice-id", status: "active" }),
        candidate({ pullRequestId: 2, authorId: "bob-id", status: "completed" }),
        candidate({ pullRequestId: 3, authorId: "bob-id", status: "abandoned" }),
      ],
    );
    assert.deepEqual(summarizeTeamPullRequests(rows), {
      totalOpened: 3,
      byStatus: { active: 1, completed: 1, abandoned: 1 },
    });
  });
});

describe("filterPullRequestMembers", () => {
  it("returns all rows when the filter is empty", () => {
    const rows = aggregatePullRequestsByMember(
      [
        { displayName: "Alice", authorId: "a" },
        { displayName: "Bob", authorId: "b" },
      ],
      [],
    );
    assert.equal(filterPullRequestMembers(rows, []).length, 2);
  });

  it("keeps selection order and inserts empty stubs for unknown names", () => {
    const rows = aggregatePullRequestsByMember(
      [{ displayName: "Alice", authorId: "a" }],
      [],
    );
    const filtered = filterPullRequestMembers(rows, ["Bob", "Alice", "Bob"]);
    assert.deepEqual(
      filtered.map((row) => row.displayName),
      ["Bob", "Alice"],
    );
    assert.equal(filtered[0]?.opened, 0);
    assert.equal(filtered[0]?.authorId, null);
  });
});

describe("toDateOnly", () => {
  it("extracts YYYY-MM-DD or returns null", () => {
    assert.equal(toDateOnly("2026-10-01T12:00:00.000Z"), "2026-10-01");
    assert.equal(toDateOnly("2026-10-01"), "2026-10-01");
    assert.equal(toDateOnly(null), null);
    assert.equal(toDateOnly(""), null);
    assert.equal(toDateOnly("not-a-date"), null);
  });
});
