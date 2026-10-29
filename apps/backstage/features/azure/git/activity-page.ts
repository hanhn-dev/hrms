import type { GitCommitSummary } from "@hrms/azure-devops";

export function appendBy<T>(
  current: readonly T[],
  next: readonly T[],
  key: (value: T) => string | number,
): T[] {
  const merged = new Map<string | number, T>();
  for (const value of current) {
    merged.set(key(value), value);
  }
  for (const value of next) {
    merged.set(key(value), value);
  }
  return [...merged.values()];
}

export function mergeCommitPages(
  current: readonly GitCommitSummary[],
  next: readonly GitCommitSummary[],
): GitCommitSummary[] {
  return appendBy(current, next, (commit) => commit.commitId).sort((left, right) =>
    (right.authoredAt ?? "").localeCompare(left.authoredAt ?? ""),
  );
}
