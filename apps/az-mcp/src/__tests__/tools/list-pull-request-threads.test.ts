import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  listPullRequestThreads: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { listPullRequestThreads } from '@hrms/azure-devops';
import type { AzureDevOpsClient, PullRequestThreadsResponse } from '@hrms/azure-devops';
import { createListPullRequestThreadsHandler } from '../../tools/list-pull-request-threads.js';

const mockClient = {} as AzureDevOpsClient;

const mockThreads: PullRequestThreadsResponse = {
  pullRequestId: 501,
  threads: [
    {
      threadId: 11,
      status: 'active',
      filePath: '/src/login.ts',
      line: 12,
      comments: [{ id: 1, author: 'Bob', content: 'nits', publishedDate: '2026-08-20T10:00:00Z' }],
    },
  ],
};

describe('az_list_pull_request_threads tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns serialised threads for a pull request ID', async () => {
    vi.mocked(listPullRequestThreads).mockResolvedValue(mockThreads);
    const handler = createListPullRequestThreadsHandler(mockClient);
    const result = await handler({ pullRequest: 501 });

    expect(result.isError).toBeFalsy();
    expect(listPullRequestThreads).toHaveBeenCalledWith(mockClient, { pullRequest: 501 });
    const parsed = JSON.parse(result.content[0]!.text) as PullRequestThreadsResponse;
    expect(parsed.threads[0]?.line).toBe(12);
  });

  it('returns isError when the pull request cannot be read', async () => {
    vi.mocked(listPullRequestThreads).mockRejectedValue(new Error('Pull request 9 not found'));
    const handler = createListPullRequestThreadsHandler(mockClient);
    const result = await handler({ pullRequest: 9 });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Pull request 9 not found');
  });
});
