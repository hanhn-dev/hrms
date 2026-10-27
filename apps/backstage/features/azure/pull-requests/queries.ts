"use server";

import {
  getWorkItem,
  listAreaModules,
  listProjectMembers,
  listTeamIterations,
  searchPullRequests as searchPullRequestsInAzure,
  type AreaModule,
  type PullRequestSearchCriteria,
  type PullRequestSearchResult,
  type TeamIteration,
  type TeamMember,
  type WorkItem,
} from "@hrms/azure-devops";
import {
  getDonePullRequestIds as getDonePullRequestIdsFromStore,
  setPullRequestDone,
} from "@/features/azure/pull-requests/done-store";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { PullRequestSearchResult, WorkItem };

export type PullRequestSearchOptions = {
  readonly teamMembers: readonly TeamMember[];
  readonly modules: readonly AreaModule[];
  readonly iterations: readonly TeamIteration[];
};

export async function loadPullRequestSearchOptions(): Promise<PullRequestSearchOptions> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const [teamMembers, modules, iterations] = await Promise.all([
    listProjectMembers(client),
    listAreaModules(client),
    listTeamIterations(client),
  ]);
  return { teamMembers, modules, iterations };
}

export async function searchPullRequests(
  criteria: PullRequestSearchCriteria,
): Promise<PullRequestSearchResult> {
  await requireFeature("azure");
  return searchPullRequestsInAzure(getAzureDevOpsClient(), criteria);
}

export async function getWorkItemDetail(id: number): Promise<WorkItem> {
  await requireFeature("azure");
  return getWorkItem(getAzureDevOpsClient(), id);
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
