import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LineDiffBlockChangeType,
  PullRequestStatus,
  VersionControlChangeType,
} from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import {
  getOrganizationIdentity,
  getPullRequestDetail,
  parsePullRequestReference,
} from '../pull-request-detail.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/example',
  project: 'Sample Project',
  token: 'token',
};

const mockGitApi = {
  getPullRequestById: vi.fn(),
  getPullRequest: vi.fn(),
  getPullRequestIterations: vi.fn(),
  getPullRequestIterationChanges: vi.fn(),
  getPullRequestCommits: vi.fn(),
  getFileDiffs: vi.fn(),
  getItem: vi.fn(),
  getItemContent: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getGitApi: vi.fn().mockResolvedValue(mockGitApi),
} as unknown as AzureDevOpsClient;

function createReadable(content: string): NodeJS.ReadableStream {
  return Readable.from([Buffer.from(content, 'utf8')]);
}

describe('parsePullRequestReference', () => {
  it('parses numeric IDs and digit-only strings', () => {
    expect(parsePullRequestReference(501)).toEqual({ kind: 'id', pullRequestId: 501 });
    expect(parsePullRequestReference('501')).toEqual({ kind: 'id', pullRequestId: 501 });
  });

  it('parses dev.azure.com pull request URLs', () => {
    expect(
      parsePullRequestReference('https://dev.azure.com/example/Sample%20Project/_git/app/pullrequest/501?_a=overview'),
    ).toEqual({
      kind: 'url',
      pullRequestId: 501,
      project: 'Sample Project',
      repository: 'app',
      organization: 'example',
    });
  });

  it('parses visualstudio.com pull request URLs', () => {
    expect(
      parsePullRequestReference('https://example.visualstudio.com/Sample%20Project/_git/app/pullRequest/77'),
    ).toEqual({
      kind: 'url',
      pullRequestId: 77,
      project: 'Sample Project',
      repository: 'app',
      organization: 'example',
    });
  });

  it('rejects invalid identifiers', () => {
    expect(() => parsePullRequestReference(0)).toThrow(/Invalid pull request identifier/);
    expect(() => parsePullRequestReference('not-a-pr')).toThrow(/Invalid pull request identifier/);
    expect(() => parsePullRequestReference('https://github.com/org/repo/pull/1')).toThrow(/Invalid pull request URL/);
  });
});

describe('getOrganizationIdentity', () => {
  it('extracts organization identity from supported org URL shapes', () => {
    expect(getOrganizationIdentity('https://dev.azure.com/example')).toBe('example');
    expect(getOrganizationIdentity('https://example.visualstudio.com')).toBe('example');
  });
});

describe('getPullRequestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getGitApi = vi.fn().mockResolvedValue(mockGitApi);
  });

  function mockHappyPathApis(): void {
    mockGitApi.getPullRequestById.mockResolvedValue({
      pullRequestId: 501,
      title: 'Fix login',
      description: 'Adds null checks',
      status: PullRequestStatus.Active,
      createdBy: { displayName: 'Alice' },
      creationDate: new Date('2026-07-29T10:00:00.000Z'),
      sourceRefName: 'refs/heads/feature/login',
      targetRefName: 'refs/heads/main',
      repository: {
        id: 'repo-guid',
        name: 'app',
        project: { id: 'project-guid', name: 'Sample Project' },
      },
      lastMergeSourceCommit: { commitId: 'source-501' },
      lastMergeTargetCommit: { commitId: 'target-501' },
      reviewers: [{ displayName: 'Bob', vote: 10, isRequired: true }],
      workItemRefs: [{ id: '135898' }],
      commits: [],
    });
    mockGitApi.getPullRequest.mockResolvedValue({
      pullRequestId: 501,
      title: 'Fix login',
      description: 'Adds null checks',
      status: PullRequestStatus.Active,
      createdBy: { displayName: 'Alice' },
      creationDate: new Date('2026-07-29T10:00:00.000Z'),
      sourceRefName: 'refs/heads/feature/login',
      targetRefName: 'refs/heads/main',
      url: 'https://dev.azure.com/example/Sample%20Project/_git/app/pullrequest/501',
      repository: {
        id: 'repo-guid',
        name: 'app',
        project: { id: 'project-guid', name: 'Sample Project' },
      },
      lastMergeSourceCommit: { commitId: 'source-501' },
      lastMergeTargetCommit: { commitId: 'target-501' },
      reviewers: [{ displayName: 'Bob', vote: 10, isRequired: true }],
      workItemRefs: [{ id: '135898' }],
      commits: [{ commitId: 'source-501', comment: 'Fix validation', author: { name: 'Alice' } }],
    });
    mockGitApi.getPullRequestIterations.mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ]);
    mockGitApi.getPullRequestIterationChanges.mockResolvedValue({
      changeEntries: [
        {
          changeType: VersionControlChangeType.Edit,
          item: { path: '/src/login.ts', contentMetadata: { isBinary: false } },
        },
        {
          changeType: VersionControlChangeType.Add,
          item: { path: '/src/new.ts', contentMetadata: { isBinary: false } },
        },
        {
          changeType: VersionControlChangeType.Delete,
          item: { path: '/src/old.ts', contentMetadata: { isBinary: false } },
        },
        {
          changeType: VersionControlChangeType.Rename | VersionControlChangeType.Edit,
          item: { path: '/src/renamed.ts', contentMetadata: { isBinary: false } },
          originalPath: '/src/before.ts',
        },
        {
          changeType: VersionControlChangeType.Edit,
          item: { path: '/assets/logo.png', contentMetadata: { isBinary: true } },
        },
      ],
      nextSkip: 0,
      nextTop: 0,
    });
    mockGitApi.getFileDiffs.mockResolvedValue([
      {
        path: '/src/login.ts',
        lineDiffBlocks: [
          {
            changeType: LineDiffBlockChangeType.Edit,
            originalLineNumberStart: 1,
            originalLinesCount: 1,
            modifiedLineNumberStart: 1,
            modifiedLinesCount: 1,
          },
        ],
      },
    ]);
    mockGitApi.getItem.mockResolvedValue({
      path: '/src/login.ts',
      contentMetadata: { isBinary: false },
    });
    mockGitApi.getItemContent.mockImplementation(async (_repo, path) => {
      if (path === '/src/login.ts') {
        return createReadable('export function login() {}');
      }
      if (path === '/src/new.ts') {
        return createReadable('export const value = 1;');
      }
      if (path === '/src/old.ts') {
        return createReadable('export const legacy = true;');
      }
      if (path === '/src/renamed.ts' || path === '/src/before.ts') {
        return createReadable('export const renamed = true;');
      }
      return createReadable('');
    });
  }

  it('returns review-ready details for a numeric pull request ID', async () => {
    mockHappyPathApis();

    const result = await getPullRequestDetail(mockClient, { pullRequest: 501 });

    expect(result.pullRequestId).toBe(501);
    expect(result.title).toBe('Fix login');
    expect(result.author).toBe('Alice');
    expect(result.status).toBe('active');
    expect(result.iterationId).toBe(2);
    expect(result.reviewers).toEqual([{ displayName: 'Bob', vote: 'approved', isRequired: true }]);
    expect(result.workItemIds).toEqual([135898]);
    expect(result.changes.returnedCount).toBe(5);
    expect(result.changes.hasMore).toBe(false);
    expect(result.changes.files.find((file) => file.path === '/src/login.ts')).toMatchObject({
      changeType: 'edit',
      baseContent: null,
      currentContent: null,
    });
    expect(result.changes.files.find((file) => file.path === '/src/login.ts')?.unifiedDiff).toContain('@@ -1,1 +1,1 @@');
    expect(result.changes.files.find((file) => file.path === '/src/new.ts')?.changeType).toBe('add');
    expect(result.changes.files.find((file) => file.path === '/src/new.ts')?.unifiedDiff).toContain('+export const value = 1;');
    expect(result.changes.files.find((file) => file.path === '/src/old.ts')?.changeType).toBe('delete');
    expect(result.changes.files.find((file) => file.path === '/src/old.ts')?.unifiedDiff).toContain('-export const legacy = true;');
    expect(result.changes.files.find((file) => file.path === '/src/renamed.ts')).toMatchObject({
      changeType: 'rename',
      originalPath: '/src/before.ts',
    });
    expect(result.changes.files.find((file) => file.path === '/assets/logo.png')).toMatchObject({
      isBinary: true,
      omission: 'Binary or non-text content omitted',
      unifiedDiff: null,
      baseContent: null,
      currentContent: null,
    });
    expect(mockGitApi.getPullRequestById).toHaveBeenCalledWith(501, 'Sample Project');
    expect(mockGitApi.getPullRequestIterationChanges).toHaveBeenCalledWith(
      'repo-guid',
      501,
      2,
      'Sample Project',
      50,
      0,
      0,
    );
  });

  it('returns base and current file contents when includeContents is true', async () => {
    mockHappyPathApis();

    const result = await getPullRequestDetail(mockClient, { pullRequest: 501, includeContents: true });
    const login = result.changes.files.find((file) => file.path === '/src/login.ts');

    expect(login?.baseContent).toBe('export function login() {}');
    expect(login?.currentContent).toBe('export function login() {}');
    expect(login?.unifiedDiff).toContain('export function login() {}');
  });

  it('resolves a same-organization URL through repository-scoped lookup', async () => {
    mockHappyPathApis();

    const result = await getPullRequestDetail(mockClient, {
      pullRequest: 'https://dev.azure.com/example/Sample%20Project/_git/app/pullrequest/501',
      top: 10,
      skip: 0,
    });

    expect(result.pullRequestId).toBe(501);
    expect(mockGitApi.getPullRequest).toHaveBeenCalledWith(
      'app',
      501,
      'Sample Project',
      undefined,
      undefined,
      undefined,
      true,
      true,
    );
    expect(mockGitApi.getPullRequestById).not.toHaveBeenCalled();
    expect(mockGitApi.getPullRequestIterationChanges).toHaveBeenCalledWith(
      'repo-guid',
      501,
      2,
      'Sample Project',
      10,
      0,
      0,
    );
  });

  it('rejects URLs outside the configured organization', async () => {
    await expect(
      getPullRequestDetail(mockClient, {
        pullRequest: 'https://dev.azure.com/other-org/Sample%20Project/_git/app/pullrequest/501',
      }),
    ).rejects.toThrow('Pull request URL is outside the configured Azure DevOps organization');
  });

  it('reports pagination metadata when more changes remain', async () => {
    mockHappyPathApis();
    mockGitApi.getPullRequestIterationChanges.mockResolvedValue({
      changeEntries: [
        {
          changeType: VersionControlChangeType.Edit,
          item: { path: '/src/login.ts', contentMetadata: { isBinary: false } },
        },
      ],
      nextSkip: 1,
      nextTop: 50,
    });

    const result = await getPullRequestDetail(mockClient, { pullRequest: 501, top: 1, skip: 0 });

    expect(result.changes).toMatchObject({
      returnedCount: 1,
      skip: 0,
      top: 1,
      hasMore: true,
      totalCount: 1,
    });
  });

  it('maps not-found Azure failures to a clear error', async () => {
    mockGitApi.getPullRequestById.mockRejectedValue(new Error('TF401019: Pull request not found'));

    await expect(getPullRequestDetail(mockClient, { pullRequest: 9999 })).rejects.toThrow(
      'Pull request 9999 not found',
    );
  });

  it('maps inaccessible Azure failures to a clear error', async () => {
    mockGitApi.getPullRequestById.mockRejectedValue(new Error('Access Denied'));

    await expect(getPullRequestDetail(mockClient, { pullRequest: 501 })).rejects.toThrow(
      'Pull request 501 is inaccessible',
    );
  });

  it('rejects out-of-range pagination inputs', async () => {
    await expect(getPullRequestDetail(mockClient, { pullRequest: 501, top: 0 })).rejects.toThrow(/Invalid top value/);
    await expect(getPullRequestDetail(mockClient, { pullRequest: 501, skip: -1 })).rejects.toThrow(/Invalid skip value/);
  });
});
