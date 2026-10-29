import type { PullRequestCandidate } from "@hrms/azure-devops";

export function mergePullRequestResults(
  current: readonly PullRequestCandidate[],
  next: readonly PullRequestCandidate[],
): PullRequestCandidate[] {
  const byId = new Map<number, PullRequestCandidate>();
  for (const result of current) {
    byId.set(result.pullRequestId, result);
  }
  for (const result of next) {
    byId.set(result.pullRequestId, result);
  }
  return [...byId.values()];
}
