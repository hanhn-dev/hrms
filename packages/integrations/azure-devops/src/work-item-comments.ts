import {
  CommentFormat,
  CommentSortOrder,
} from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { getAzureDevOpsErrorMessage, type AzureDevOpsClient } from './client.js';
import { htmlToMarkdown } from './html-to-text.js';
import type { WorkItemComment, WorkItemCommentsResponse } from './types.js';

const DEFAULT_TOP = 50;
const MAX_TOP = 200;

function clampTop(top: number | undefined): number {
  return Math.min(Math.max(top ?? DEFAULT_TOP, 1), MAX_TOP);
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function mapCommentText(text: string | undefined, renderedText: string | undefined, format: CommentFormat | undefined): string {
  if (format === CommentFormat.Markdown && typeof text === 'string' && text.trim().length > 0) {
    return text.trim();
  }

  const html = renderedText ?? text;
  return htmlToMarkdown(html);
}

export async function getWorkItemComments(
  client: AzureDevOpsClient,
  id: number,
  top?: number,
): Promise<WorkItemCommentsResponse> {
  const clampedTop = clampTop(top);
  const witApi = await client.getWorkItemTrackingApi();

  try {
    const result = await witApi.getComments(
      client.config.project,
      id,
      clampedTop,
      undefined,
      false,
      undefined,
      CommentSortOrder.Desc,
    );

    const comments: WorkItemComment[] = (result.comments ?? [])
      .filter((comment) => comment !== null && comment !== undefined && comment.isDeleted !== true)
      .flatMap((comment) => {
        if (typeof comment.id !== 'number') {
          return [];
        }

        return [
          {
            id: comment.id,
            author: comment.createdBy?.displayName ?? null,
            createdDate: toIsoDate(comment.createdDate),
            text: mapCommentText(comment.text, comment.renderedText, comment.format),
          },
        ];
      });

    const continuationToken =
      typeof result.continuationToken === 'string' && result.continuationToken.trim().length > 0
        ? result.continuationToken
        : null;
    const nextPage = typeof result.nextPage === 'string' && result.nextPage.trim().length > 0 ? result.nextPage : null;

    return {
      workItemId: id,
      totalCount: result.totalCount ?? comments.length,
      hasMore: continuationToken !== null || nextPage !== null,
      comments,
    };
  } catch (error) {
    throw new Error(`Azure DevOps API error: ${getAzureDevOpsErrorMessage(error)}`);
  }
}
