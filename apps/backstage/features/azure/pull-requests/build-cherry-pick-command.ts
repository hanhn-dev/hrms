import type { PullRequestCandidate } from "@hrms/azure-devops";

export type CherryPickPlan = {
  commitHashes: string[];
  command: string | null;
  skippedPullRequestIds: number[];
};

/**
 * Builds a single `git cherry-pick` command from the merge commit of each
 * selected pull request, in selection order. Mirrors the shape of
 * `@hrms/azure-devops`'s internal (unexported) `buildCherryPickPlan`, but
 * runs client-side over whatever subset of PR rows the user checked rather
 * than the full lookup result.
 */
export function buildCherryPickCommand(
  selected: readonly PullRequestCandidate[],
): CherryPickPlan {
  const commitHashes: string[] = [];
  const skippedPullRequestIds: number[] = [];

  for (const candidate of selected) {
    if (candidate.hashes.mergeCommit !== null) {
      commitHashes.push(candidate.hashes.mergeCommit);
    } else {
      skippedPullRequestIds.push(candidate.pullRequestId);
    }
  }

  return {
    commitHashes,
    command: commitHashes.length > 0 ? `git cherry-pick -m 1 ${commitHashes.join(" ")}` : null,
    skippedPullRequestIds,
  };
}
