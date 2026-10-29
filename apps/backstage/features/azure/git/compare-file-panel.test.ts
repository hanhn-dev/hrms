import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { GitCommitSummary } from "@hrms/azure-devops";
import { mergeCommitPages } from "./activity-page";

function commit(commitId: string, authoredAt: string): GitCommitSummary {
  return {
    commitId,
    authoredAt,
    authorEmail: null,
    authorName: null,
    comment: null,
    pullRequest: null,
    workItemIds: [],
  };
}

describe("mergeCommitPages", () => {
  it("deduplicates and orders commit history pages newest first", () => {
    assert.deepEqual(
      mergeCommitPages(
        [commit("a", "2026-10-01T00:00:00Z")],
        [commit("a", "2026-10-01T00:00:00Z"), commit("b", "2026-10-02T00:00:00Z")],
      ).map((item) => item.commitId),
      ["b", "a"],
    );
  });
});
