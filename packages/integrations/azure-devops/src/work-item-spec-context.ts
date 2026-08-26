import type { AzureDevOpsClient } from './client.js';
import { htmlFieldHasContent } from './coverage.js';
import { getWorkItemComments } from './work-item-comments.js';
import { getRawWorkItemsWithRelations, getWorkItem, withWorkItemLinkTitles } from './work-items.js';
import type { WorkItemSpecContext, WorkItemSpecContextChild } from './types.js';

export async function getWorkItemSpecContext(
  client: AzureDevOpsClient,
  id: number,
  options: { readonly commentTop?: number } = {},
): Promise<WorkItemSpecContext> {
  const workItem = await getWorkItem(client, id);
  const [comments, children, links] = await Promise.all([
    getWorkItemComments(client, id, options.commentTop),
    loadSpecChildren(client, workItem.childIds),
    withWorkItemLinkTitles(client, workItem.links),
  ]);

  return {
    workItem,
    comments,
    children,
    links,
    attachments: {
      images: workItem.attachments.filter((attachment) => attachment.isImage),
      documents: workItem.attachments.filter((attachment) => !attachment.isImage),
    },
    hints: buildSpecContextHints(workItem, comments),
  };
}

function buildSpecContextHints(
  workItem: Awaited<ReturnType<typeof getWorkItem>>,
  comments: Awaited<ReturnType<typeof getWorkItemComments>>,
): string[] {
  const hints = [...workItem.hints];
  const commentsMentionAc = comments.comments.some((comment) =>
    /acceptance\s*criteria|\bac[- ]?\d+/i.test(comment.text),
  );
  if (datesDifferByAtLeastOneDay(workItem.createdDate, workItem.changedDate) || commentsMentionAc) {
    hints.push(
      `Call az_get_work_item_revisions with id=${workItem.id} to see how Description/AC evolved`,
    );
  }
  return hints;
}

function datesDifferByAtLeastOneDay(createdDate: string | null, changedDate: string | null): boolean {
  if (createdDate === null || changedDate === null) {
    return false;
  }

  const created = Date.parse(createdDate);
  const changed = Date.parse(changedDate);
  if (Number.isNaN(created) || Number.isNaN(changed)) {
    return false;
  }

  return Math.abs(changed - created) >= 24 * 60 * 60 * 1000;
}

async function loadSpecChildren(
  client: AzureDevOpsClient,
  childIds: readonly number[],
): Promise<WorkItemSpecContextChild[]> {
  if (childIds.length === 0) {
    return [];
  }

  const rawById = await getRawWorkItemsWithRelations(client, childIds);
  return childIds.flatMap((childId) => {
    const raw = rawById.get(childId);
    if (raw === undefined) {
      return [];
    }

    const fields = raw.fields ?? {};
    return [
      {
        id: childId,
        title: (fields['System.Title'] as string | undefined) ?? '',
        type: (fields['System.WorkItemType'] as string | undefined) ?? '',
        state: (fields['System.State'] as string | undefined) ?? '',
        hasAcceptanceCriteria: htmlFieldHasContent(
          fields['Microsoft.VSTS.Common.AcceptanceCriteria'] as string | null | undefined,
        ),
      },
    ];
  });
}
