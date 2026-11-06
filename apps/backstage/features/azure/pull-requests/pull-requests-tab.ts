export type PullRequestsTab = "search" | "tracking";

export const DEFAULT_PULL_REQUESTS_TAB: PullRequestsTab = "search";

export function parsePullRequestsTab(value: string | undefined): PullRequestsTab {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "tracking") {
    return "tracking";
  }
  return DEFAULT_PULL_REQUESTS_TAB;
}
