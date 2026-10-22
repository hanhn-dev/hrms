import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PullRequestStatus, PullRequestTimeRangeType } from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import {
  emptyPullRequestSearchCriteria,
  filterPullRequestCandidates,
  intersectWorkItemIds,
  isPullRequestSearchCriteriaEmpty,
  searchPullRequests,
} from '../pull-request-search.js';
import type { AzureDevOpsConfig, PullRequestCandidate, PullRequestSearchCriteria } from '../types.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/example',
  project: 'TDG HRMS',
  token: 'token',
};

const mockWitApi = {
  queryByWiql: vi.fn(),
  getWorkItemsBatch: vi.fn(),
  getWorkItem: vi.fn(),
};

const mockGitApi = {
  getPullRequest: vi.fn(),
  getPullRequestsByProject: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
  getGitApi: vi.fn().mockResolvedValue(mockGitApi),
} as unknown as AzureDevOpsClient;

function criteria(overrides: Partial<PullRequestSearchCriteria> = {}): PullRequestSearchCriteria {
  return { ...emptyPullRequestSearchCriteria(), ...overrides };
}

function candidate(overrides: Partial<PullRequestCandidate> & { pullRequestId: number }): PullRequestCandidate {
  return {
    repositoryId: 'repo',
    title: 'Title',
    author: 'Alice',
    authorId: 'alice-id',
    status: 'completed',
    sourceBranch: 'refs/heads/feature',
    targetBranch: 'refs/heads/main',
    openedDate: '2026-10-05T08:00:00.000Z',
    mergedDate: '2026-10-06T08:00:00.000Z',
    url: 'https://dev.azure.com/example/project/_git/repo/pullrequest/1',
    hashes: { mergeCommit: 'abc', sourceCommit: null, targetCommit: null },
    relatedWorkItemIds: [],
    requestedWorkItemIds: [],
    childWorkItemIds: [],
    ...overrides,
  };
}

describe('isPullRequestSearchCriteriaEmpty', () => {
  it('rejects an empty form', () => {
    expect(isPullRequestSearchCriteriaEmpty(emptyPullRequestSearchCriteria())).toBe(true);
  });

  it('accepts any one filled control and ignores the date field by itself', () => {
    expect(isPullRequestSearchCriteriaEmpty(criteria({ workItemIds: '101' }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ areaPaths: ['TDG HRMS\\Ganges\\COB'] }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ types: ['Bug'] }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ states: ['Active'] }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ iterationPath: 'TDG HRMS\\Sprint' }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ assignees: ['Alice'] }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ tags: 'release' }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ titleContains: 'login' }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ dateFrom: '2026-10-01' }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ authorIds: ['alice-id'] }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ statuses: ['completed'] }))).toBe(false);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ dateField: 'merged' }))).toBe(true);
    expect(isPullRequestSearchCriteriaEmpty(criteria({ workItemIds: '   ', tags: '  ' }))).toBe(true);
  });
});

describe('intersectWorkItemIds', () => {
  it('keeps pasted ids that also matched the other work-item filters', () => {
    expect(intersectWorkItemIds([101, 102, 103], [102, 104])).toEqual([102]);
    expect(intersectWorkItemIds([101], [])).toEqual([]);
  });
});

describe('filterPullRequestCandidates', () => {
  const rows = [
    candidate({ pullRequestId: 1, authorId: 'alice-id', openedDate: '2026-10-01T00:00:00.000Z', mergedDate: '2026-10-03T00:00:00.000Z' }),
    candidate({ pullRequestId: 2, authorId: 'bob-id', openedDate: '2026-10-10T00:00:00.000Z', mergedDate: null, status: 'active' }),
    candidate({ pullRequestId: 3, authorId: 'alice-id', openedDate: '2026-09-01T00:00:00.000Z', mergedDate: '2026-10-12T00:00:00.000Z' }),
  ];

  it('filters by opened date and ORs authors', () => {
    const result = filterPullRequestCandidates(
      rows,
      criteria({
        dateField: 'opened',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-12',
        authorIds: ['alice-id', 'bob-id'],
      }),
    );

    expect(result.map((row) => row.pullRequestId)).toEqual([1, 2]);
  });

  it('drops pull requests with no merged date when the range is merged', () => {
    const result = filterPullRequestCandidates(
      rows,
      criteria({
        dateField: 'merged',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-12',
        statuses: ['completed', 'active'],
      }),
    );

    expect(result.map((row) => row.pullRequestId)).toEqual([1, 3]);
  });

  it('drops pull requests with no merged date when dateField is merged and the range is empty', () => {
    const result = filterPullRequestCandidates(
      rows,
      criteria({
        dateField: 'merged',
        dateFrom: null,
        dateTo: null,
      }),
    );

    expect(result.map((row) => row.pullRequestId)).toEqual([1, 3]);
  });
});

describe('searchPullRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWitApi.queryByWiql.mockReset();
    mockGitApi.getPullRequestsByProject.mockReset();
  });

  it('rejects an empty search before calling Azure DevOps', async () => {
    await expect(searchPullRequests(mockClient, emptyPullRequestSearchCriteria())).rejects.toThrow(
      'Enter at least one search criterion.',
    );
    expect(mockWitApi.queryByWiql).not.toHaveBeenCalled();
    expect(mockGitApi.getPullRequestsByProject).not.toHaveBeenCalled();
  });

  it('ANDs pasted ids with the area path and skips pull requests when nothing matches', async () => {
    mockWitApi.queryByWiql.mockResolvedValue({ workItems: [] });

    const result = await searchPullRequests(
      mockClient,
      criteria({
        workItemIds: '101,102,abc',
        areaPaths: ['TDG HRMS\\Ganges\\COB', 'TDG HRMS\\Ganges\\Leave'],
      }),
    );

    expect(result.results).toEqual([]);
    expect(result.issues).toEqual([
      {
        workItemId: null,
        input: 'abc',
        status: 'invalid',
        message: 'Invalid work item ID: abc',
      },
    ]);
    const wiql: string = (mockWitApi.queryByWiql.mock.calls[0]?.[0] as { query: string }).query;
    expect(wiql).toContain('[System.Id] IN (101,102)');
    expect(wiql).toContain(
      "([System.AreaPath] UNDER 'TDG HRMS\\Ganges\\COB' OR [System.AreaPath] UNDER 'TDG HRMS\\Ganges\\Leave')",
    );
    expect(mockGitApi.getPullRequestsByProject).not.toHaveBeenCalled();
  });

  it('searches pull requests directly by author and opened date when no work-item criteria are set', async () => {
    mockGitApi.getPullRequestsByProject.mockResolvedValue([
      {
        pullRequestId: 9,
        title: 'Direct',
        createdBy: { displayName: 'Alice', id: 'alice-id' },
        status: PullRequestStatus.Completed,
        repository: { id: 'repo-a', project: { id: 'project-guid' } },
        creationDate: '2026-10-05T00:00:00.000Z',
        closedDate: '2026-10-06T00:00:00.000Z',
        targetRefName: 'refs/heads/main',
        sourceRefName: 'refs/heads/feature',
      },
    ]);

    const result = await searchPullRequests(
      mockClient,
      criteria({
        authorIds: ['alice-id'],
        dateField: 'opened',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-12',
        statuses: ['completed'],
      }),
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.pullRequestId).toBe(9);
    expect(result.truncated).toBe(false);
    expect(mockGitApi.getPullRequestsByProject).toHaveBeenCalledTimes(1);
    expect(mockWitApi.queryByWiql).not.toHaveBeenCalled();
    expect(mockGitApi.getPullRequestsByProject).toHaveBeenCalledWith(
      'TDG HRMS',
      expect.objectContaining({
        creatorId: 'alice-id',
        status: PullRequestStatus.Completed,
        queryTimeRangeType: PullRequestTimeRangeType.Created,
        minTime: new Date('2026-10-01T00:00:00.000Z'),
        maxTime: new Date('2026-10-12T23:59:59.999Z'),
      }),
      undefined,
      undefined,
      200,
    );
  });

  it('uses the closed time range when the date applies to merged', async () => {
    mockGitApi.getPullRequestsByProject.mockResolvedValue([]);

    await searchPullRequests(
      mockClient,
      criteria({
        dateField: 'merged',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-12',
      }),
    );

    const criteriaArg = mockGitApi.getPullRequestsByProject.mock.calls[0]?.[1] as {
      queryTimeRangeType?: number;
    };
    expect(criteriaArg.queryTimeRangeType).toBe(PullRequestTimeRangeType.Closed);
    expect(mockGitApi.getPullRequestsByProject).toHaveBeenCalledTimes(3);
  });
});
