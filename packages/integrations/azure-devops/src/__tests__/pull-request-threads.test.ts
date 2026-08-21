import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentThreadStatus, PullRequestStatus } from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import { listPullRequestThreads } from '../pull-request-threads.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/example',
  project: 'Sample Project',
  token: 'token',
};

const mockGitApi = {
  getPullRequestById: vi.fn(),
  getPullRequest: vi.fn(),
  getThreads: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getGitApi: vi.fn().mockResolvedValue(mockGitApi),
} as unknown as AzureDevOpsClient;

describe('listPullRequestThreads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGitApi.getPullRequestById.mockResolvedValue({
      pullRequestId: 501,
      status: PullRequestStatus.Active,
      repository: { id: 'repo-guid', name: 'app', project: { name: 'Sample Project' } },
    });
    mockGitApi.getPullRequest.mockResolvedValue({
      pullRequestId: 501,
      status: PullRequestStatus.Active,
      repository: { id: 'repo-guid', name: 'app', project: { name: 'Sample Project' } },
    });
  });

  it('returns active threads with file and line anchors and omits deleted threads', async () => {
    mockGitApi.getThreads.mockResolvedValue([
      {
        id: 11,
        status: CommentThreadStatus.Active,
        isDeleted: false,
        threadContext: {
          filePath: '/src/login.ts',
          rightFileStart: { line: 12, offset: 1 },
        },
        comments: [
          {
            id: 1,
            content: 'Please null-check',
            author: { displayName: 'Bob' },
            publishedDate: '2026-08-20T10:00:00Z',
            isDeleted: false,
          },
        ],
      },
      {
        id: 12,
        status: CommentThreadStatus.Fixed,
        isDeleted: false,
        threadContext: { filePath: '/src/other.ts', rightFileStart: { line: 3 } },
        comments: [{ id: 2, content: 'done', isDeleted: false }],
      },
      {
        id: 13,
        status: CommentThreadStatus.Active,
        isDeleted: true,
        comments: [],
      },
    ]);

    const result = await listPullRequestThreads(mockClient, { pullRequest: 501 });

    expect(result.pullRequestId).toBe(501);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]).toMatchObject({
      threadId: 11,
      status: 'active',
      filePath: '/src/login.ts',
      line: 12,
    });
    expect(result.threads[0]?.comments[0]).toMatchObject({
      id: 1,
      author: 'Bob',
      content: 'Please null-check',
    });
  });
});
