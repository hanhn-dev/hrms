"use server";

import { createWorkItem, type WorkItem } from "@hrms/azure-devops";
import {
  getDraft,
  listDrafts,
  markDraftPublished,
  markDraftRejected,
  type WorkItemDraft,
} from "@/features/azure/work-item-drafts/drafts";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { WorkItemDraft };

export type PublishDraftResult = {
  readonly draft: WorkItemDraft;
  readonly workItem: WorkItem;
};

export async function listWorkItemDrafts(): Promise<WorkItemDraft[]> {
  await requireFeature("azure");
  return listDrafts();
}

export async function getWorkItemDraft(id: string): Promise<WorkItemDraft | null> {
  await requireFeature("azure");
  return getDraft(id) ?? null;
}

export async function publishWorkItemDraft(id: string): Promise<PublishDraftResult> {
  await requireFeature("azure");
  const draft = getDraft(id);
  if (!draft) {
    throw new Error("Draft not found");
  }
  if (draft.status !== "pending") {
    throw new Error("Only pending drafts can be published");
  }

  const client = getAzureDevOpsClient();
  const workItem = await createWorkItem(
    client,
    {
      title: draft.title,
      description: draft.description,
      acceptanceCriteria: draft.acceptanceCriteria,
      type: "Product Backlog Item",
      tags: draft.tags,
      assignedTo: draft.assignedTo,
      areaPath: draft.areaPath,
      iterationPath: draft.iterationPath,
      priority: draft.priority,
      parentId: draft.parentId,
    },
    client.config,
  );

  const next = markDraftPublished(id, workItem.id);
  return { draft: next, workItem };
}

export async function rejectWorkItemDraft(
  id: string,
  reason?: string,
): Promise<WorkItemDraft> {
  await requireFeature("azure");
  return markDraftRejected(id, reason);
}
