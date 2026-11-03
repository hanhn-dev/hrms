"use server";

import {
  countWorkItemLinkedPullRequests,
  getWorkItem,
  getWorkItemComments as getWorkItemCommentsFromAzure,
  getWorkItemPullRequests,
  type PullRequestCandidate,
  type WorkItem,
  type WorkItemCommentsResponse,
} from "@hrms/azure-devops";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { PullRequestCandidate, WorkItem, WorkItemCommentsResponse };

export async function getWorkItemDetail(id: number): Promise<WorkItem> {
  await requireFeature("azure");
  return getWorkItem(getAzureDevOpsClient(), id);
}

export async function getWorkItemComments(id: number): Promise<WorkItemCommentsResponse> {
  await requireFeature("azure");
  return getWorkItemCommentsFromAzure(getAzureDevOpsClient(), id);
}

/** Unique linked PR count (item + child Tasks/Issues) without hydrating PR details. */
export async function getWorkItemLinkedPullRequestCount(id: number): Promise<number> {
  await requireFeature("azure");
  return countWorkItemLinkedPullRequests(getAzureDevOpsClient(), { ids: String(id) });
}

/** Linked PRs for a work item (and child Tasks/Issues), without refinement prompts. */
export async function getWorkItemLinkedPullRequests(
  id: number,
): Promise<readonly PullRequestCandidate[]> {
  await requireFeature("azure");
  const response = await getWorkItemPullRequests(getAzureDevOpsClient(), {
    ids: String(id),
    confirmUnfiltered: true,
  });
  return response.results ?? [];
}
