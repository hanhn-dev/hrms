import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getPullRequestDetail: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getPullRequestDetail } from '@hrms/azure-devops';
import type { AzureDevOpsClient, PullRequestDetail } from '@hrms/azure-devops';
import { createGetPullRequestHandler } from '../../tools/get-pull-request.js';

const mockClient = {} as AzureDevOpsClient;

const mockDetail: PullRequestDetail = {
  pullRequestId: 501,
  title: 'Fix login',
  description: 'Adds null checks',
  status: 'active',
  author: 'Alice',
  createdDate: '2026-07-29T10:00:00.000Z',
  closedDate: null,
  sourceBranch: 'refs/heads/feature/login',
  targetBranch: 'refs/heads/main',
  url: 'https://dev.azure.com/example/Sample%20Project/_git/app/pullrequest/501',
  projectId: 'Sample Project',
  repositoryId: 'repo-guid',
  repositoryName: 'app',
  hashes: {
    mergeCommit: null,
    sourceCommit: 'source-501',
    targetCommit: 'target-501',
  },
  reviewers: [{ displayName: 'Bob', vote: 'approved', isRequired: true }],
  commits: [{ commitId: 'source-501', comment: 'Fix validation', author: 'Alice' }],
  workItemIds: [135898],
  iterationId: 2,
  changes: {
    totalCount: 1,
    returnedCount: 1,
    skip: 0,
    top: 50,
    hasMore: false,
    files: [
      {
        path: '/src/login.ts',
        originalPath: null,
        changeType: 'edit',
        isBinary: false,
        omission: null,
        truncation: null,
        baseContent: 'export function login() {}',
        currentContent: 'export function login(user: string) {}',
        lineDiffBlocks: [],
      },
    ],
  },
};

describe('az_get_pull_request tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns serialised pull request detail for a valid ID', async () => {
    vi.mocked(getPullRequestDetail).mockResolvedValue(mockDetail);
    const handler = createGetPullRequestHandler(mockClient);
    const result = await handler({ pullRequest: 501 });

    expect(result.isError).toBeFalsy();
    expect(getPullRequestDetail).toHaveBeenCalledWith(mockClient, { pullRequest: 501, top: undefined, skip: undefined });
    const parsed = JSON.parse(result.content[0]!.text) as PullRequestDetail;
    expect(parsed.pullRequestId).toBe(501);
    expect(parsed.changes.files[0]?.path).toBe('/src/login.ts');
  });

  it('passes URL and pagination arguments through', async () => {
    vi.mocked(getPullRequestDetail).mockResolvedValue(mockDetail);
    const handler = createGetPullRequestHandler(mockClient);
    const url = 'https://dev.azure.com/example/Sample%20Project/_git/app/pullrequest/501';

    await handler({ pullRequest: url, top: 10, skip: 5 });

    expect(getPullRequestDetail).toHaveBeenCalledWith(mockClient, {
      pullRequest: url,
      top: 10,
      skip: 5,
    });
  });

  it('returns isError: true when the pull request is not found', async () => {
    vi.mocked(getPullRequestDetail).mockRejectedValue(new Error('Pull request 9999 not found'));
    const handler = createGetPullRequestHandler(mockClient);
    const result = await handler({ pullRequest: 9999 });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Pull request 9999 not found');
  });
});
