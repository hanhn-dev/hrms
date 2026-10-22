import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PullRequestCandidate } from "@hrms/azure-devops";
import {
  buildCherryPickCommand,
  orderSelectedCandidates,
} from "./build-cherry-pick-command";

function candidate(
  overrides: Partial<PullRequestCandidate> & { pullRequestId: number },
): PullRequestCandidate {
  return {
    repositoryId: "repo",
    title: "Title",
    author: "Author",
    authorId: null,
    status: "completed",
    sourceBranch: "refs/heads/feature/x",
    targetBranch: "refs/heads/main",
    openedDate: null,
    mergedDate: null,
    url: "https://dev.azure.com/example/_git/repo/pullrequest/1",
    hashes: { mergeCommit: null, sourceCommit: null, targetCommit: null },
    relatedWorkItemIds: [],
    requestedWorkItemIds: [],
    childWorkItemIds: [],
    ...overrides,
  };
}

describe("buildCherryPickCommand", () => {
  it("returns a null command and no hashes for an empty selection", () => {
    const result = buildCherryPickCommand([]);
    assert.equal(result.command, null);
    assert.deepEqual(result.commitHashes, []);
    assert.deepEqual(result.skippedPullRequestIds, []);
  });

  it("builds one command from every selected PR's merge commit, in caller order", () => {
    const result = buildCherryPickCommand([
      candidate({
        pullRequestId: 2,
        hashes: { mergeCommit: "def456", sourceCommit: null, targetCommit: null },
      }),
      candidate({
        pullRequestId: 1,
        hashes: { mergeCommit: "abc123", sourceCommit: null, targetCommit: null },
      }),
    ]);
    assert.equal(
      result.command,
      "git cherry-pick -m 1 --allow-empty --keep-redundant-commits def456 abc123",
    );
    assert.deepEqual(result.commitHashes, ["def456", "abc123"]);
    assert.deepEqual(result.skippedPullRequestIds, []);
  });

  it("skips PRs with no merge commit yet and reports them separately", () => {
    const result = buildCherryPickCommand([
      candidate({
        pullRequestId: 7,
        status: "active",
        hashes: { mergeCommit: null, sourceCommit: null, targetCommit: null },
      }),
      candidate({
        pullRequestId: 8,
        hashes: { mergeCommit: "feed00d", sourceCommit: null, targetCommit: null },
      }),
    ]);
    assert.equal(
      result.command,
      "git cherry-pick -m 1 --allow-empty --keep-redundant-commits feed00d",
    );
    assert.deepEqual(result.commitHashes, ["feed00d"]);
    assert.deepEqual(result.skippedPullRequestIds, [7]);
  });
});

describe("orderSelectedCandidates", () => {
  const rows = [
    candidate({
      pullRequestId: 32404,
      mergedDate: "2026-10-14T12:26:40Z",
      hashes: { mergeCommit: "bbb", sourceCommit: null, targetCommit: null },
    }),
    candidate({
      pullRequestId: 32788,
      mergedDate: "2026-10-21T06:43:03Z",
      hashes: { mergeCommit: "ccc", sourceCommit: null, targetCommit: null },
    }),
    candidate({
      pullRequestId: 32348,
      mergedDate: "2026-10-14T07:47:23Z",
      hashes: { mergeCommit: "aaa", sourceCommit: null, targetCommit: null },
    }),
  ];

  it("returns nothing for an empty selection", () => {
    assert.deepEqual(
      orderSelectedCandidates(rows, [], { key: "mergedDate", order: "ascend" }).map(
        (row) => row.pullRequestId,
      ),
      [],
    );
  });

  it("orders selected rows by mergedDate ascending (oldest first)", () => {
    const ordered = orderSelectedCandidates(
      rows,
      [32788, 32348, 32404],
      { key: "mergedDate", order: "ascend" },
    );
    assert.deepEqual(
      ordered.map((row) => row.pullRequestId),
      [32348, 32404, 32788],
    );
  });

  it("orders selected rows by mergedDate descending", () => {
    const ordered = orderSelectedCandidates(
      rows,
      [32348, 32404, 32788],
      { key: "mergedDate", order: "descend" },
    );
    assert.deepEqual(
      ordered.map((row) => row.pullRequestId),
      [32788, 32404, 32348],
    );
  });

  it("orders selected rows by pullRequestId when sorting by title", () => {
    const ordered = orderSelectedCandidates(rows, [32788, 32348], {
      key: "title",
      order: "ascend",
    });
    assert.deepEqual(
      ordered.map((row) => row.pullRequestId),
      [32348, 32788],
    );
  });

  it("preserves results order when sort is null", () => {
    const ordered = orderSelectedCandidates(rows, [32348, 32404], null);
    assert.deepEqual(
      ordered.map((row) => row.pullRequestId),
      [32404, 32348],
    );
  });
});
