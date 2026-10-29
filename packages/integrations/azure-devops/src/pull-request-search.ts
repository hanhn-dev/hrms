import {
  PullRequestStatus,
  PullRequestTimeRangeType,
  type GitPullRequest,
  type GitPullRequestSearchCriteria,
} from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import {
  getAzureDevOpsErrorMessage,
  withAzureDevOpsTimeout,
  type AzureDevOpsClient,
} from './client.js';
import { mapGitPullRequestToCandidate, getWorkItemPullRequests } from './pull-requests.js';
import {
  filterPullRequestCandidates,
  hasWorkItemFieldCriteria,
  hasWorkItemSearchCriteria,
  intersectWorkItemIds,
  isPullRequestSearchCriteriaEmpty,
} from './pull-request-search-criteria.js';
import type {
  PullRequestCandidate,
  PullRequestLookupIssue,
  PullRequestSearchCriteria,
  PullRequestSearchResult,
  SearchWorkItemsFilter,
} from './types.js';
import { PULL_REQUEST_SEARCH_LIMIT, PULL_REQUEST_STATUS_OPTIONS } from './types.js';
import { parseWorkItemIdsInput, searchWorkItemIds } from './work-items.js';

export {
  emptyPullRequestSearchCriteria,
  filterPullRequestCandidates,
  hasWorkItemSearchCriteria,
  intersectWorkItemIds,
  isPullRequestSearchCriteriaEmpty,
} from './pull-request-search-criteria.js';

const WORK_ITEM_ID_CHUNK = 25;

function splitTags(tags: string): string[] {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function invalidIdIssues(rawIds: string): PullRequestLookupIssue[] {
  if (rawIds.trim().length === 0) {
    return [];
  }

  return parseWorkItemIdsInput(rawIds)
    .entries.filter((entry) => entry.parsedId === null)
    .map((entry) => ({
      workItemId: null,
      input: entry.normalizedValue,
      status: 'invalid' as const,
      message: `Invalid work item ID: ${entry.normalizedValue.length > 0 ? entry.normalizedValue : '<empty>'}`,
    }));
}

function chunkIds(ids: readonly number[]): number[][] {
  const chunks: number[][] = [];
  for (let index = 0; index < ids.length; index += WORK_ITEM_ID_CHUNK) {
    chunks.push(ids.slice(index, index + WORK_ITEM_ID_CHUNK));
  }
  return chunks;
}

function mergeCandidates(candidates: readonly PullRequestCandidate[]): PullRequestCandidate[] {
  const byKey = new Map<string, PullRequestCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.repositoryId}:${candidate.pullRequestId}`;
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, candidate);
      continue;
    }

    byKey.set(key, {
      ...existing,
      relatedWorkItemIds: [...new Set([...existing.relatedWorkItemIds, ...candidate.relatedWorkItemIds])].sort(
        (left, right) => left - right,
      ),
      requestedWorkItemIds: [...new Set([...existing.requestedWorkItemIds, ...candidate.requestedWorkItemIds])].sort(
        (left, right) => left - right,
      ),
      childWorkItemIds: [...new Set([...existing.childWorkItemIds, ...candidate.childWorkItemIds])].sort(
        (left, right) => left - right,
      ),
    });
  }

  return [...byKey.values()];
}

function sortSearchResults(candidates: readonly PullRequestCandidate[]): PullRequestCandidate[] {
  return [...candidates].sort((left, right) => {
    const byDate = (right.openedDate ?? '').localeCompare(left.openedDate ?? '');
    if (byDate !== 0) {
      return byDate;
    }

    return right.pullRequestId - left.pullRequestId;
  });
}

function workItemFilter(criteria: PullRequestSearchCriteria, ids: readonly number[]): SearchWorkItemsFilter {
  return {
    areaPaths: criteria.areaPaths,
    types: criteria.types,
    states: criteria.states,
    iteration: criteria.iterationPath,
    assignees: criteria.assignees,
    tags: splitTags(criteria.tags),
    titleContains: criteria.titleContains,
    ids,
  };
}

async function lookupLinkedPullRequests(
  client: AzureDevOpsClient,
  ids: readonly number[],
): Promise<{ results: PullRequestCandidate[]; issues: PullRequestLookupIssue[] }> {
  const responses = await Promise.all(
    chunkIds(ids).map((idsInChunk) =>
      getWorkItemPullRequests(client, {
        ids: idsInChunk.join(','),
        confirmUnfiltered: true,
        includeChildLinks: false,
      }),
    ),
  );

  return {
    results: mergeCandidates(responses.flatMap((response) => response.results ?? [])),
    issues: responses.flatMap((response) => response.issues),
  };
}

function finish(
  candidates: readonly PullRequestCandidate[],
  issues: readonly PullRequestLookupIssue[],
  criteria: PullRequestSearchCriteria,
  sourceTruncated: boolean,
  nextSkip: number | null = null,
): PullRequestSearchResult {
  const sorted = sortSearchResults(filterPullRequestCandidates(candidates, criteria));
  const truncated = sourceTruncated || sorted.length > PULL_REQUEST_SEARCH_LIMIT;
  return {
    results: sorted.slice(0, PULL_REQUEST_SEARCH_LIMIT),
    issues,
    truncated,
    nextSkip: truncated ? nextSkip : null,
  };
}

function statusEnum(status: string): PullRequestStatus {
  switch (status) {
    case 'completed':
      return PullRequestStatus.Completed;
    case 'abandoned':
      return PullRequestStatus.Abandoned;
    default:
      return PullRequestStatus.Active;
  }
}

function utcDayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function utcDayEnd(day: string): Date {
  return new Date(`${day}T23:59:59.999Z`);
}

async function searchPullRequestsDirectly(
  client: AzureDevOpsClient,
  criteria: PullRequestSearchCriteria,
  skip: number,
): Promise<PullRequestSearchResult> {
  const gitApi = await client.getGitApi();
  const authorIds = criteria.authorIds.map((id) => id.trim()).filter((id) => id.length > 0);
  const creators: readonly (string | undefined)[] = authorIds.length > 0 ? authorIds : [undefined];
  const selectedStatuses = criteria.statuses.map((status) => status.trim().toLowerCase()).filter((status) => status.length > 0);
  const statuses = selectedStatuses.length > 0 ? selectedStatuses : [...PULL_REQUEST_STATUS_OPTIONS];
  const hasDate = criteria.dateFrom !== null || criteria.dateTo !== null;
  let truncated = false;
  const pullRequests: GitPullRequest[] = [];

  await Promise.all(
    creators.flatMap((creatorId) =>
      statuses.map(async (status) => {
        const searchCriteria: GitPullRequestSearchCriteria = {
          status: statusEnum(status),
        };
        if (creatorId !== undefined) {
          searchCriteria.creatorId = creatorId;
        }
        if (hasDate) {
          searchCriteria.queryTimeRangeType =
            criteria.dateField === 'merged' ? PullRequestTimeRangeType.Closed : PullRequestTimeRangeType.Created;
          if (criteria.dateFrom !== null) {
            searchCriteria.minTime = utcDayStart(criteria.dateFrom);
          }
          if (criteria.dateTo !== null) {
            searchCriteria.maxTime = utcDayEnd(criteria.dateTo);
          }
        }

        let page: GitPullRequest[];
        try {
          page = await gitApi.getPullRequestsByProject(
            client.config.project,
            searchCriteria,
            undefined,
            skip,
            PULL_REQUEST_SEARCH_LIMIT,
          );
        } catch (error) {
          throw new Error(`Azure DevOps pull request API error: ${getAzureDevOpsErrorMessage(error)}`);
        }

        const rows = page ?? [];
        if (rows.length >= PULL_REQUEST_SEARCH_LIMIT) {
          truncated = true;
        }
        pullRequests.push(...rows);
      }),
    ),
  );

  const candidates = pullRequests.flatMap((pullRequest) => {
    if (typeof pullRequest.pullRequestId !== 'number') {
      return [];
    }

    const repositoryId = pullRequest.repository?.id ?? '';
    const projectId = pullRequest.repository?.project?.id ?? pullRequest.repository?.project?.name ?? client.config.project;
    if (repositoryId.length === 0) {
      return [];
    }

    return [
      mapGitPullRequestToCandidate(pullRequest, client.config.orgUrl, {
        repositoryId,
        projectId,
        pullRequestId: pullRequest.pullRequestId,
      }),
    ];
  });

  return finish(
    mergeCandidates(candidates),
    [],
    criteria,
    truncated,
    truncated ? skip + PULL_REQUEST_SEARCH_LIMIT : null,
  );
}

export async function searchPullRequests(
  client: AzureDevOpsClient,
  criteria: PullRequestSearchCriteria,
  skip = 0,
): Promise<PullRequestSearchResult> {
  if (isPullRequestSearchCriteriaEmpty(criteria)) {
    throw new Error('Enter at least one search criterion.');
  }

  return withAzureDevOpsTimeout(searchPullRequestsBounded(client, criteria, skip));
}

async function searchPullRequestsBounded(
  client: AzureDevOpsClient,
  criteria: PullRequestSearchCriteria,
  skip: number,
): Promise<PullRequestSearchResult> {
  if (!hasWorkItemSearchCriteria(criteria)) {
    return searchPullRequestsDirectly(client, criteria, Math.max(0, Math.floor(skip)));
  }

  const rawIds = criteria.workItemIds.trim();
  const parsed = rawIds.length > 0 ? parseWorkItemIdsInput(rawIds) : null;
  const invalidIssues = invalidIdIssues(rawIds);
  const fieldsSelected = hasWorkItemFieldCriteria(criteria);

  if (parsed !== null && fieldsSelected && parsed.validUniqueIds.length === 0) {
    return { results: [], issues: invalidIssues, truncated: false };
  }

  if (!fieldsSelected && parsed !== null) {
    if (parsed.validUniqueIds.length === 0) {
      return { results: [], issues: invalidIssues, truncated: false };
    }

    const linked = await lookupLinkedPullRequests(client, parsed.validUniqueIds);
    return finish(linked.results, [...invalidIssues, ...linked.issues], criteria, false);
  }

  const idRestriction = parsed?.validUniqueIds ?? [];
  const matched = await searchWorkItemIds(
    client,
    workItemFilter(criteria, idRestriction),
    client.config,
  );
  const ids = parsed === null ? matched.ids : intersectWorkItemIds(parsed.validUniqueIds, matched.ids);
  if (ids.length === 0) {
    return { results: [], issues: invalidIssues, truncated: matched.truncated };
  }

  const linked = await lookupLinkedPullRequests(client, ids);
  return finish(linked.results, [...invalidIssues, ...linked.issues], criteria, matched.truncated);
}
