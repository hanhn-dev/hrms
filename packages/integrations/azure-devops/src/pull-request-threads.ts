import { CommentThreadStatus } from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import { classifyPullRequestLookupError, getAzureDevOpsErrorMessage, type AzureDevOpsClient } from './client.js';
import { parsePullRequestReference, resolvePullRequest } from './pull-request-detail.js';
import type { PullRequestThread, PullRequestThreadsRequest, PullRequestThreadsResponse } from './types.js';

const THREAD_STATUS_NAMES: Record<number, string> = {
  [CommentThreadStatus.Unknown]: 'unknown',
  [CommentThreadStatus.Active]: 'active',
  [CommentThreadStatus.Fixed]: 'fixed',
  [CommentThreadStatus.WontFix]: 'wontfix',
  [CommentThreadStatus.Closed]: 'closed',
  [CommentThreadStatus.ByDesign]: 'bydesign',
  [CommentThreadStatus.Pending]: 'pending',
};

function normalizeThreadStatus(status: CommentThreadStatus | undefined): string {
  if (status === undefined) {
    return 'unknown';
  }

  return THREAD_STATUS_NAMES[status] ?? 'unknown';
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

export async function listPullRequestThreads(
  client: AzureDevOpsClient,
  request: PullRequestThreadsRequest,
): Promise<PullRequestThreadsResponse> {
  const reference = parsePullRequestReference(request.pullRequest);
  const { pullRequest, projectId, repositoryId } = await resolvePullRequest(client, reference);
  const pullRequestId = pullRequest.pullRequestId ?? reference.pullRequestId;
  const statusFilter = (request.status ?? 'active').trim().toLowerCase();
  const gitApi = await client.getGitApi();

  try {
    const rawThreads = await gitApi.getThreads(repositoryId, pullRequestId, projectId);
    const threads: PullRequestThread[] = (rawThreads ?? [])
      .filter((thread) => thread.isDeleted !== true)
      .map((thread) => {
        const status = normalizeThreadStatus(thread.status);
        const filePath =
          typeof thread.threadContext?.filePath === 'string' && thread.threadContext.filePath.trim().length > 0
            ? thread.threadContext.filePath
            : null;
        const line = thread.threadContext?.rightFileStart?.line ?? thread.threadContext?.leftFileStart?.line ?? null;

        return {
          threadId: thread.id ?? 0,
          status,
          filePath,
          line: typeof line === 'number' ? line : null,
          comments: (thread.comments ?? [])
            .filter((comment) => comment.isDeleted !== true && typeof comment.id === 'number')
            .map((comment) => ({
              id: comment.id!,
              author: comment.author?.displayName ?? null,
              content: typeof comment.content === 'string' ? comment.content : '',
              publishedDate: toIsoDate(comment.publishedDate),
            })),
        };
      })
      .filter((thread) => thread.threadId > 0 && thread.status === statusFilter);

    return {
      pullRequestId,
      threads,
    };
  } catch (error) {
    const status = classifyPullRequestLookupError(error);
    if (status === 'inaccessible') {
      throw new Error(`Pull request ${pullRequestId} is inaccessible`);
    }
    throw new Error(`Azure DevOps pull request API error: ${getAzureDevOpsErrorMessage(error)}`);
  }
}
