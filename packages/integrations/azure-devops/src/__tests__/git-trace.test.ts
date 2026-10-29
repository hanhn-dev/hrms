import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GitPullRequestQueryType,
  GitVersionType,
  LineDiffBlockChangeType,
  PullRequestStatus,
  VersionControlChangeType,
  VersionControlRecursionType,
} from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import {
  compareGitCommits,
  getGitCommitDetail,
  listGitAuthorActivity,
  listGitBranches,
  listGitCommits,
  listGitFiles,
  listGitRepositories,
  readGitFilePair,
  searchGitPaths,
} from '../git-trace.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/example',
  project: 'Sample Project',
  token: 'token',
};

const mockGitApi = {
  getRepositories: vi.fn(),
  getRefs: vi.fn(),
  getCommits: vi.fn(),
  getCommit: vi.fn(),
  getChanges: vi.fn(),
  getCommitDiffs: vi.fn(),
  getItem: vi.fn(),
  getItemContent: vi.fn(),
  getItems: vi.fn(),
  getFileDiffs: vi.fn(),
  getPullRequestQuery: vi.fn(),
  getPullRequests: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getGitApi: vi.fn().mockResolvedValue(mockGitApi),
} as unknown as AzureDevOpsClient;

const BASE_COMMIT = 'a'.repeat(40);
const TARGET_COMMIT = 'b'.repeat(40);

describe('git trace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getGitApi = vi.fn().mockResolvedValue(mockGitApi);
    mockGitApi.getPullRequestQuery.mockResolvedValue({ results: [{}, {}] });
  });

  it('lists repositories and strips the default branch prefix', async () => {
    mockGitApi.getRepositories.mockResolvedValue([
      { id: 'repo-b', name: 'HRMS DB', defaultBranch: 'refs/heads/develop', webUrl: 'https://dev.azure.com/example/p/_git/HRMS%20DB' },
      { id: '', name: 'Missing' },
      { id: 'repo-a', name: 'HRMS', defaultBranch: 'refs/heads/main' },
    ]);

    const repositories = await listGitRepositories(mockClient);

    expect(repositories.map((repository) => repository.name)).toEqual(['HRMS', 'HRMS DB']);
    expect(repositories[0]).toMatchObject({ id: 'repo-a', defaultBranch: 'main', webUrl: null });
    expect(repositories[1]?.defaultBranch).toBe('develop');
  });

  it('lists branch tips and ignores tags', async () => {
    mockGitApi.getRefs.mockResolvedValue([
      { name: 'refs/heads/release/2026.05', objectId: '1'.repeat(40) },
      { name: 'refs/tags/v1', objectId: '2'.repeat(40) },
      { name: 'refs/heads/main', objectId: '3'.repeat(40) },
      { name: 'refs/heads/', objectId: '4'.repeat(40) },
    ]);

    const branches = await listGitBranches(mockClient, 'repo-a');

    expect(mockGitApi.getRefs).toHaveBeenCalledWith('repo-a', 'Sample Project', 'heads/');
    expect(branches).toEqual([
      { name: 'main', commitId: '3'.repeat(40) },
      { name: 'release/2026.05', commitId: '1'.repeat(40) },
    ]);
  });

  it('lists files on a branch and skips folders and blank paths', async () => {
    mockGitApi.getItems.mockResolvedValue([
      { path: '/', isFolder: true },
      { path: '/src', isFolder: true },
      { path: '/src/b.ts', isFolder: false },
      { path: '/src/a.ts' },
      { path: '/src/a.ts', isFolder: false },
      { path: '   ' },
      { isFolder: false },
      { path: '/', isFolder: false },
    ]);

    const paths = await listGitFiles(mockClient, 'repo-a', 'refs/heads/Dev');

    expect(mockGitApi.getItems).toHaveBeenCalledWith(
      'repo-a',
      'Sample Project',
      '/',
      VersionControlRecursionType.Full,
      false,
      false,
      false,
      false,
      { version: 'Dev', versionType: GitVersionType.Branch },
    );
    expect(paths).toEqual(['/src/a.ts', '/src/b.ts']);
  });

  it('rejects a blank branch before listing files', async () => {
    await expect(listGitFiles(mockClient, 'repo-a', '  ')).rejects.toThrow('Branch is required');
    expect(mockGitApi.getItems).not.toHaveBeenCalled();
  });

  it('searches bounded one-level tree pages instead of recursively expanding root', async () => {
    mockGitApi.getItems
      .mockResolvedValueOnce([
        { path: '/', isFolder: true },
        { path: '/apps', isFolder: true },
        { path: '/README.md', isFolder: false },
      ])
      .mockResolvedValueOnce([
        { path: '/apps', isFolder: true },
        { path: '/apps/backstage', isFolder: true },
        { path: '/apps/index.ts', isFolder: false },
      ])
      .mockResolvedValueOnce([
        { path: '/apps/backstage', isFolder: true },
        { path: '/apps/backstage/page.tsx', isFolder: false },
      ]);

    const paths = await searchGitPaths(mockClient, 'repo-a', 'Dev', 'page');

    expect(paths).toEqual(['/README.md', '/apps/index.ts', '/apps/backstage/page.tsx']);
    expect(mockGitApi.getItems).toHaveBeenCalledTimes(3);
    expect(mockGitApi.getItems.mock.calls.every((call) => call[3] === VersionControlRecursionType.OneLevel)).toBe(true);
    expect(mockGitApi.getItems.mock.calls.some((call) => call[3] === VersionControlRecursionType.Full)).toBe(false);
  });

  it('does not call Azure for a blank path search', async () => {
    await expect(searchGitPaths(mockClient, 'repo-a', 'Dev', '  ')).resolves.toEqual([]);
    expect(mockGitApi.getItems).not.toHaveBeenCalled();
  });

  it('maps commit author and work item ids and omits an empty path', async () => {
    mockGitApi.getCommits.mockResolvedValue([
      {
        commitId: BASE_COMMIT,
        comment: '  Fix leave balance  ',
        author: { name: 'Ada Lovelace', email: 'ada@example.com', date: new Date('2026-10-01T08:30:00Z') },
        workItems: [
          { id: '162833', url: 'https://dev.azure.com/example/_apis/wit/workItems/162833' },
          { url: 'https://dev.azure.com/example/_apis/wit/workItems/99' },
          { id: '162833' },
        ],
      },
      { comment: 'no id' },
    ]);

    const page = await listGitCommits(mockClient, {
      repositoryId: 'repo-a',
      branch: 'refs/heads/main',
      path: '   ',
      author: ' Ada ',
    });
    const commits = page.commits;

    expect(mockGitApi.getCommits.mock.calls[0]?.[1]).toEqual({
      includeWorkItems: true,
      $top: 50,
      itemVersion: { version: 'main', versionType: GitVersionType.Branch },
      author: 'Ada',
    });
    expect(mockGitApi.getCommits.mock.calls[0]?.[1].itemPath).toBeUndefined();
    expect(commits).toEqual([
      {
        commitId: BASE_COMMIT,
        comment: 'Fix leave balance',
        authorName: 'Ada Lovelace',
        authorEmail: 'ada@example.com',
        authoredAt: '2026-10-01T08:30:00.000Z',
        workItemIds: [99, 162833],
        pullRequest: null,
      },
    ]);
    expect(page.hasMore).toBe(false);
  });

  it('requests the next commit page and reports more when the page is full', async () => {
    mockGitApi.getCommits.mockResolvedValue(
      Array.from({ length: 50 }, (_, index) => ({
        commitId: index.toString(16).padStart(40, 'c'),
        comment: `Commit ${index}`,
        author: { name: 'Ada', date: new Date(Date.UTC(2026, 0, 1, 0, index)) },
      })),
    );

    const page = await listGitCommits(mockClient, {
      repositoryId: 'repo-a',
      branch: 'Dev',
      skip: 50,
    });

    expect(mockGitApi.getCommits).toHaveBeenCalledWith(
      'repo-a',
      {
        includeWorkItems: true,
        $top: 50,
        $skip: 50,
        itemVersion: { version: 'Dev', versionType: GitVersionType.Branch },
      },
      'Sample Project',
      50,
      50,
    );
    expect(page.commits).toHaveLength(50);
    expect(page).toMatchObject({ skip: 50, top: 50, hasMore: true });
  });

  it('reads a merged pull request from the commit message and prefers the query result', async () => {
    mockGitApi.getCommits.mockResolvedValue([
      {
        commitId: BASE_COMMIT,
        comment: 'Merged PR 33699: change GPA/Grade field to free text',
        author: { name: 'Nam Nguyen', date: new Date('2026-10-29T03:53:10Z') },
      },
      {
        commitId: TARGET_COMMIT,
        comment: 'Merged PR 9: ignored when the query returns a pull request',
        author: { name: 'Ada', date: new Date('2026-10-28T03:53:10Z') },
      },
    ]);
    mockGitApi.getPullRequestQuery.mockResolvedValue({
      results: [
        { [TARGET_COMMIT]: [{ pullRequestId: 4402, title: 'Hotfix' }] },
        {},
      ],
    });

    const commits = (
      await listGitCommits(mockClient, {
        repositoryId: 'repo-a',
        branch: 'Dev',
        authors: ['Nam Nguyen', ' Ada '],
      })
    ).commits;

    expect(mockGitApi.getCommits).toHaveBeenCalledTimes(2);
    expect(mockGitApi.getPullRequestQuery).toHaveBeenCalledWith(
      {
        queries: [
          { type: GitPullRequestQueryType.LastMergeCommit, items: [BASE_COMMIT, TARGET_COMMIT] },
          { type: GitPullRequestQueryType.Commit, items: [BASE_COMMIT, TARGET_COMMIT] },
        ],
      },
      'repo-a',
      'Sample Project',
    );
    expect(commits.map((commit) => commit.pullRequest)).toEqual([
      { id: 33699, title: 'change GPA/Grade field to free text' },
      { id: 4402, title: 'Hotfix' },
    ]);
  });

  it('lists pull requests and commits for one author in the repository', async () => {
    mockGitApi.getCommits.mockResolvedValue([
      {
        commitId: BASE_COMMIT,
        comment: 'Fix leave balance',
        author: { name: 'Ada Lovelace', date: new Date('2026-10-01T08:30:00Z') },
      },
    ]);
    mockGitApi.getPullRequests.mockResolvedValue([
      {
        pullRequestId: 12,
        title: 'Leave balance',
        status: PullRequestStatus.Completed,
        creationDate: new Date('2026-10-02T00:00:00Z'),
      },
      { title: 'Missing id' },
    ]);

    const activity = await listGitAuthorActivity(mockClient, {
      repositoryId: 'repo-a',
      authorName: 'Ada Lovelace',
      branch: 'Dev',
      creatorId: 'ada-id',
    });

    expect(mockGitApi.getPullRequests).toHaveBeenCalledWith(
      'repo-a',
      { creatorId: 'ada-id', status: PullRequestStatus.All },
      'Sample Project',
      undefined,
      0,
      50,
    );
    expect(activity.pullRequests).toEqual([
      {
        id: 12,
        title: 'Leave balance',
        status: 'Completed',
        createdAt: '2026-10-02T00:00:00.000Z',
      },
    ]);
    expect(activity.commits).toHaveLength(1);
    expect(activity).toMatchObject({ skip: 0, top: 50, hasMore: false });
  });

  it('normalizes commit file changes and keeps the first parent', async () => {
    mockGitApi.getCommit.mockResolvedValue({
      commitId: TARGET_COMMIT,
      comment: 'Rename payroll',
      author: { name: 'Grace' },
      parents: ['', BASE_COMMIT],
    });
    mockGitApi.getChanges.mockResolvedValue({
      changes: [
        { changeType: VersionControlChangeType.Edit, item: { path: 'src/a.ts' } },
        {
          changeType: VersionControlChangeType.Add | VersionControlChangeType.Edit,
          item: { path: '/src/b.ts' },
        },
        {
          changeType: VersionControlChangeType.Rename,
          item: { path: '/src/c.ts' },
          originalPath: '/src/old.ts',
        },
        { changeType: VersionControlChangeType.Delete, item: { path: '/src/d.ts' } },
        { changeType: VersionControlChangeType.Edit, item: { isFolder: true, path: '/src' } },
        { changeType: VersionControlChangeType.Edit },
      ],
    });

    const detail = await getGitCommitDetail(mockClient, 'repo-a', TARGET_COMMIT);

    expect(detail.parentCommitId).toBe(BASE_COMMIT);
    expect(detail.authorName).toBe('Grace');
    expect(detail.files).toEqual([
      { path: '/src/a.ts', originalPath: null, changeType: 'edit' },
      { path: '/src/b.ts', originalPath: null, changeType: 'add' },
      { path: '/src/c.ts', originalPath: '/src/old.ts', changeType: 'rename' },
      { path: '/src/d.ts', originalPath: null, changeType: 'delete' },
    ]);
  });

  it('diffs two commits directly and drops a change with no path', async () => {
    mockGitApi.getCommitDiffs.mockResolvedValue({
      baseCommit: BASE_COMMIT,
      targetCommit: TARGET_COMMIT,
      commonCommit: 'c'.repeat(40),
      aheadCount: 2,
      behindCount: 0,
      allChangesIncluded: true,
      changes: [
        { changeType: VersionControlChangeType.Edit, item: { path: '/src/a.ts' } },
        { changeType: VersionControlChangeType.None },
      ],
    });

    const compared = await compareGitCommits(mockClient, {
      repositoryId: 'repo-a',
      baseCommitId: BASE_COMMIT,
      targetCommitId: TARGET_COMMIT,
    });

    expect(mockGitApi.getCommitDiffs).toHaveBeenCalledWith(
      'repo-a',
      'Sample Project',
      false,
      100,
      0,
      { version: BASE_COMMIT, versionType: GitVersionType.Commit },
      { version: TARGET_COMMIT, versionType: GitVersionType.Commit },
    );
    expect(compared.files).toEqual([{ path: '/src/a.ts', originalPath: null, changeType: 'edit' }]);
    expect(compared.allChangesIncluded).toBe(true);
    expect(compared.commonCommitId).toBe('c'.repeat(40));
  });

  it('rejects a commit id that is not a git sha', async () => {
    await expect(
      compareGitCommits(mockClient, {
        repositoryId: 'repo-a',
        baseCommitId: 'main',
        targetCommitId: TARGET_COMMIT,
      }),
    ).rejects.toThrow('Base commit must be a Git commit id');
    expect(mockGitApi.getCommitDiffs).not.toHaveBeenCalled();
  });

  it('omits a missing file and a binary file', async () => {
    mockGitApi.getItem.mockImplementation(async (_repositoryId: string, path: string) => {
      if (path === '/missing.ts') {
        throw Object.assign(new Error('TF401174: The item could not be found'), { statusCode: 404 });
      }
      return { path, contentMetadata: { isBinary: true } };
    });
    mockGitApi.getFileDiffs.mockResolvedValue([]);

    const pair = await readGitFilePair(mockClient, {
      repositoryId: 'repo-a',
      base: { commitId: BASE_COMMIT, path: '/missing.ts' },
      target: { commitId: TARGET_COMMIT, path: '/logo.png' },
    });

    expect(pair.base).toEqual({
      content: null,
      missing: true,
      isBinary: false,
      truncated: false,
      omission: null,
    });
    expect(pair.target).toMatchObject({
      content: null,
      missing: false,
      isBinary: true,
      omission: 'Binary or non-text content omitted',
    });
    expect(mockGitApi.getItemContent).not.toHaveBeenCalled();
  });

  it('reads both texts and maps line diff blocks', async () => {
    mockGitApi.getItem.mockResolvedValue({ contentMetadata: { isBinary: false } });
    mockGitApi.getItemContent.mockImplementation(async () => Readable.from([Buffer.from('const name = 1;\n')]));
    mockGitApi.getFileDiffs.mockResolvedValue([
      {
        path: '/src/a.ts',
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

    const pair = await readGitFilePair(mockClient, {
      repositoryId: 'repo-a',
      base: { commitId: BASE_COMMIT, path: 'src/a.ts' },
      target: { commitId: TARGET_COMMIT, path: 'src/a.ts' },
    });

    expect(pair.base.content).toBe('const name = 1;\n');
    expect(pair.target.content).toBe('const name = 1;\n');
    expect(pair.base.truncated).toBe(false);
    expect(pair.lineDiffBlocks).toEqual([
      {
        changeType: 'edit',
        originalLineNumberStart: 1,
        originalLinesCount: 1,
        modifiedLineNumberStart: 1,
        modifiedLinesCount: 1,
      },
    ]);
    expect(mockGitApi.getItem.mock.calls[0]?.[1]).toBe('/src/a.ts');
  });
});
