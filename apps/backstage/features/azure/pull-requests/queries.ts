"use server";

import {
  listAreaModules,
  listTeamMembers,
  listTeamIterations,
  searchPullRequests as searchPullRequestsInAzure,
  type AreaModule,
  type PullRequestSearchCriteria,
  type PullRequestSearchResult,
  type TeamIteration,
  type TeamMember,
} from "@hrms/azure-devops";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import {
  getDonePullRequestIds as getDonePullRequestIdsFromStore,
  setPullRequestDone,
} from "@/features/azure/pull-requests/done-store";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { PullRequestSearchResult };

export type PullRequestSearchOptions = {
  readonly teamMembers: readonly TeamMember[];
  readonly modules: readonly AreaModule[];
  readonly iterations: readonly TeamIteration[];
};

export async function loadPullRequestSearchOptions(): Promise<PullRequestSearchOptions> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const team = client.config.team?.trim() || DEFAULT_BOARD_TEAM;
  const [teamMembers, iterations] = await Promise.all([
    listTeamMembers(client, team),
    listTeamIterations(client),
  ]);
  return { teamMembers, modules: [], iterations };
}

export async function loadPullRequestAreas(): Promise<AreaModule[]> {
  await requireFeature("azure");
  return listAreaModules(getAzureDevOpsClient());
}

export async function searchPullRequests(
  criteria: PullRequestSearchCriteria,
  skip = 0,
): Promise<PullRequestSearchResult> {
  await requireFeature("azure");
  return searchPullRequestsInAzure(getAzureDevOpsClient(), criteria, skip);
}

/** Which of the given pull request ids an operator has already marked done. */
export async function getDonePullRequestIds(
  pullRequestIds: readonly number[],
): Promise<number[]> {
  await requireFeature("azure");
  return getDonePullRequestIdsFromStore(pullRequestIds);
}

export async function markPullRequestDone(
  pullRequestId: number,
  done: boolean,
): Promise<void> {
  const session = await requireFeature("azure");
  setPullRequestDone(pullRequestId, done, session.name ?? session.email ?? null);
}
