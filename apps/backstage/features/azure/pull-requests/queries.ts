"use server";

import {
  getWorkItem,
  getWorkItemPullRequests,
  type PullRequestLookupResponse,
  type WorkItem,
} from "@hrms/azure-devops";
import {
  getDonePullRequestIds as getDonePullRequestIdsFromStore,
  setPullRequestDone,
} from "@/features/azure/pull-requests/done-store";
import { requireRootAdmin } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { PullRequestLookupResponse, WorkItem };

export async function lookupPullRequestsForWorkItems(
  ids: string,
): Promise<PullRequestLookupResponse> {
  await requireRootAdmin();
  const client = getAzureDevOpsClient();
  // confirmUnfiltered skips the chat-elicitation "needs_refinement" stage
  // (that flow exists for az-mcp's AI clients) and always resolves straight
  // to the full "complete" result — this screen's table already supports
  // sorting/filtering/selecting, so no server-side refinement round trip is
  // needed.
  return getWorkItemPullRequests(client, { ids, confirmUnfiltered: true });
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
