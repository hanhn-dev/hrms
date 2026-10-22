import type { PullRequestCandidate } from "@hrms/azure-devops";

export type CherryPickPlan = {
  commitHashes: string[];
  command: string | null;
  skippedPullRequestIds: number[];
};

/** Columns the pull-requests table can sort by for cherry-pick ordering. */
export type CherryPickSortKey = "mergedDate" | "title";

export type CherryPickSortOrder = "ascend" | "descend";

export type CherryPickSort = {
  key: CherryPickSortKey;
  order: CherryPickSortOrder;
} | null;

const CHERRY_PICK_FLAGS = "-m 1 --allow-empty --keep-redundant-commits";

function compareCandidates(
  left: PullRequestCandidate,
  right: PullRequestCandidate,
  sort: NonNullable<CherryPickSort>,
): number {
  const direction = sort.order === "ascend" ? 1 : -1;
  const raw =
    sort.key === "mergedDate"
      ? (left.mergedDate ?? "").localeCompare(right.mergedDate ?? "")
      : left.pullRequestId - right.pullRequestId;
  return raw * direction;
}

/**
 * Orders selected pull requests to match the table's current visual sort,
 * then returns only the selected rows. When `sort` is null, preserves
 * `results` order (API order).
 */
export function orderSelectedCandidates(
  results: readonly PullRequestCandidate[],
  selectedIds: readonly number[],
  sort: CherryPickSort,
): PullRequestCandidate[] {
  const selectedSet = new Set(selectedIds);
  const ordered = sort === null ? [...results] : [...results].sort((left, right) => compareCandidates(left, right, sort));
  return ordered.filter((candidate) => selectedSet.has(candidate.pullRequestId));
}

/**
 * Builds a single `git cherry-pick` command from the merge commit of each
 * selected pull request, in caller-provided order (typically the table's
 * current display order). Mirrors the shape of `@hrms/azure-devops`'s
 * internal (unexported) `buildCherryPickPlan`, but runs client-side over
 * whatever subset of PR rows the user checked rather than the full lookup
 * result. Uses `--allow-empty` and `--keep-redundant-commits` so already-
 * applied patches do not abort a multi-commit cherry-pick.
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
    command:
      commitHashes.length > 0
        ? `git cherry-pick ${CHERRY_PICK_FLAGS} ${commitHashes.join(" ")}`
        : null,
    skippedPullRequestIds,
  };
}
