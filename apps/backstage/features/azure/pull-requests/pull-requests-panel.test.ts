import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PullRequestCandidate } from "@hrms/azure-devops";
import { mergePullRequestResults } from "./result-page";

function candidate(pullRequestId: number, title: string): PullRequestCandidate {
  return { pullRequestId, title } as PullRequestCandidate;
}

describe("mergePullRequestResults", () => {
  it("appends a direct-search page without duplicate pull requests", () => {
    assert.deepEqual(
      mergePullRequestResults(
        [candidate(1, "old")],
        [candidate(1, "updated"), candidate(2, "next")],
      ).map((item) => [item.pullRequestId, item.title]),
      [[1, "updated"], [2, "next"]],
    );
  });
});
