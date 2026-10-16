"use server";

import {
  getWorkItem,
  listAreaModules,
  listTeamIterations,
  listTeamMembers,
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
import { requireRootAdmin } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { PullRequestSearchResult, WorkItem };

export type PullRequestSearchOptions = {
  readonly teamMembers: readonly TeamMember[];
  readonly modules: readonly AreaModule[];
  readonly iterations: readonly TeamIteration[];
};

export async function loadPullRequestSearchOptions(): Promise<PullRequestSearchOptions> {
  await requireRootAdmin();
  const client = getAzureDevOpsClient();
  const [teamMembers, modules, iterations] = await Promise.all([
    listTeamMembers(client),
    listAreaModules(client),
    listTeamIterations(client),
  ]);
  return { teamMembers, modules, iterations };
}

export async function searchPullRequests(
  criteria: PullRequestSearchCriteria,
): Promise<PullRequestSearchResult> {
  await requireRootAdmin();
  return searchPullRequestsInAzure(getAzureDevOpsClient(), criteria);
}

export async function getWorkItemDetail(id: number): Promise<WorkItem> {
  await requireRootAdmin();
  return getWorkItem(getAzureDevOpsClient(), id);
}

/** Which of the given pull request ids an operator has already marked done. */
export async function getDonePullRequestIds(
  pullRequestIds: readonly number[],
): Promise<number[]> {
  await requireRootAdmin();
  return getDonePullRequestIdsFromStore(pullRequestIds);
}

export async function markPullRequestDone(
  pullRequestId: number,
  done: boolean,
): Promise<void> {
  const session = await requireRootAdmin();
  setPullRequestDone(pullRequestId, done, session.name ?? session.email ?? null);
}
