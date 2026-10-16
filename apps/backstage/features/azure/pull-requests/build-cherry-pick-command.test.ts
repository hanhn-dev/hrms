import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PullRequestCandidate } from "@hrms/azure-devops";
import { buildCherryPickCommand } from "./build-cherry-pick-command";

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

  it("builds one command from every selected PR's merge commit, in selection order", () => {
    const result = buildCherryPickCommand([
      candidate({ pullRequestId: 2, hashes: { mergeCommit: "def456", sourceCommit: null, targetCommit: null } }),
      candidate({ pullRequestId: 1, hashes: { mergeCommit: "abc123", sourceCommit: null, targetCommit: null } }),
    ]);
    assert.equal(result.command, "git cherry-pick -m 1 def456 abc123");
    assert.deepEqual(result.commitHashes, ["def456", "abc123"]);
    assert.deepEqual(result.skippedPullRequestIds, []);
  });

  it("skips PRs with no merge commit yet and reports them separately", () => {
    const result = buildCherryPickCommand([
      candidate({ pullRequestId: 7, status: "active", hashes: { mergeCommit: null, sourceCommit: null, targetCommit: null } }),
      candidate({ pullRequestId: 8, hashes: { mergeCommit: "feed00d", sourceCommit: null, targetCommit: null } }),
    ]);
    assert.equal(result.command, "git cherry-pick -m 1 feed00d");
    assert.deepEqual(result.commitHashes, ["feed00d"]);
    assert.deepEqual(result.skippedPullRequestIds, [7]);
  });
});
