import { PullRequestStatus, type GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { WorkItem as AzureWorkItem, WorkItemRelation } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { getAzureDevOpsErrorMessage, type AzureDevOpsClient } from './client.js';
import type {
  PullRequestArtifactReference,
  PullRequestCandidate,
  PullRequestCherryPickPlan,
  PullRequestFilterFacets,
  PullRequestLookupResponse,
  PullRequestSortField,
  RefinementQuestion,
  WorkItemPullRequestLookupRequest,
} from './types.js';
import { getRawWorkItemsWithRelations, resolveRawWorkItemsByIds } from './work-items.js';

const ARTIFACT_LINK_REL = 'ArtifactLink';
const CHILD_LINK_REL = 'System.LinkTypes.Hierarchy-Forward';
const DEFAULT_SORT_FIELD: PullRequestSortField = 'pullRequestId';

type CandidateAccumulator = {
  readonly reference: PullRequestArtifactReference;
  readonly relatedWorkItemIds: Set<number>;
  readonly requestedWorkItemIds: Set<number>;
  readonly childWorkItemIds: Set<number>;
};

function isArtifactLinkRelation(relation: WorkItemRelation | undefined | null): relation is WorkItemRelation & { url: string } {
  return relation !== null && relation !== undefined && relation.rel === ARTIFACT_LINK_REL && typeof relation.url === 'string';
}

function isChildRelation(relation: WorkItemRelation | undefined | null): relation is WorkItemRelation & { url: string } {
  return relation !== null && relation !== undefined && relation.rel === CHILD_LINK_REL && typeof relation.url === 'string';
}

function parsePositiveId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

function parseChildWorkItemId(url: string): number | null {
  try {
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const candidate = segments[segments.length - 1];
    return candidate ? parsePositiveId(candidate) : null;
  } catch {
    const segments = url.split('/').filter(Boolean);
    const candidate = segments[segments.length - 1];
    return candidate ? parsePositiveId(candidate) : null;
  }
}

function parsePullRequestArtifactReference(
  url: string,
  linkedWorkItemId: number,
  requestedAncestorId: number,
  linkSource: 'requested' | 'child',
): PullRequestArtifactReference | null {
  const prefix = 'vstfs:///Git/PullRequestId/';
  if (!url.startsWith(prefix)) {
    return null;
  }

  const decodedPath = decodeURIComponent(url.slice(prefix.length));
  const segments = decodedPath.split('/').filter(Boolean);
  if (segments.length !== 3) {
    return null;
  }

  const pullRequestId = parsePositiveId(segments[2]!);
  if (pullRequestId === null) {
    return null;
  }

  return {
    projectId: segments[0]!,
    repositoryId: segments[1]!,
    pullRequestId,
    linkedWorkItemId,
    requestedAncestorId,
    linkSource,
  };
}

function collectChildIds(rawWorkItem: AzureWorkItem): number[] {
  return (rawWorkItem.relations ?? [])
    .filter(isChildRelation)
    .flatMap((relation) => {
      const childId = parseChildWorkItemId(relation.url);
      return childId === null ? [] : [childId];
    });
}

function collectChildGraph(workItems: readonly AzureWorkItem[]): Map<number, Set<number>> {
  const childGraph = new Map<number, Set<number>>();

  for (const workItem of workItems) {
    if (typeof workItem.id !== 'number') {
      continue;
    }

    const childIds = collectChildIds(workItem);
    if (childIds.length === 0) {
      continue;
    }

    const children = childGraph.get(workItem.id) ?? new Set<number>();
    for (const childId of childIds) {
      children.add(childId);
    }
    childGraph.set(workItem.id, children);
  }

  return childGraph;
}

async function collectDescendantWorkItems(
  client: AzureDevOpsClient,
  requestedWorkItems: readonly AzureWorkItem[],
): Promise<ReadonlyMap<number, AzureWorkItem>> {
  const descendantWorkItemsById = new Map<number, AzureWorkItem>();
  const frontier = new Set<number>(requestedWorkItems.flatMap((workItem) => collectChildIds(workItem)));

  while (frontier.size > 0) {
    const idsToFetch = [...frontier].filter((id) => !descendantWorkItemsById.has(id));
    frontier.clear();

    if (idsToFetch.length === 0) {
      continue;
    }

    const fetchedWorkItems = await getRawWorkItemsWithRelations(client, idsToFetch);

    for (const [id, workItem] of fetchedWorkItems.entries()) {
      if (descendantWorkItemsById.has(id)) {
        continue;
      }

      descendantWorkItemsById.set(id, workItem);

      for (const childId of collectChildIds(workItem)) {
        if (!descendantWorkItemsById.has(childId)) {
          frontier.add(childId);
        }
      }
    }
  }

  return descendantWorkItemsById;
}

function collectDescendantAncestorMap(
  requestedWorkItems: readonly AzureWorkItem[],
  descendantWorkItems: ReadonlyMap<number, AzureWorkItem>,
): Map<number, Set<number>> {
  const childGraph = collectChildGraph([...requestedWorkItems, ...descendantWorkItems.values()]);
  const descendantAncestorMap = new Map<number, Set<number>>();

  for (const requestedWorkItem of requestedWorkItems) {
    const requestedId = requestedWorkItem.id;
    if (typeof requestedId !== 'number') {
      continue;
    }

    const visited = new Set<number>();
    const pendingIds = [...(childGraph.get(requestedId) ?? [])];

    while (pendingIds.length > 0) {
      const currentId = pendingIds.pop();
      if (currentId === undefined || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);
      const ancestors = descendantAncestorMap.get(currentId) ?? new Set<number>();
      ancestors.add(requestedId);
      descendantAncestorMap.set(currentId, ancestors);

      for (const childId of childGraph.get(currentId) ?? []) {
        if (!visited.has(childId)) {
          pendingIds.push(childId);
        }
      }
    }
  }

  return descendantAncestorMap;
}

function collectArtifactReferences(
  rawWorkItem: AzureWorkItem,
  requestedAncestorId: number,
  linkSource: 'requested' | 'child',
): PullRequestArtifactReference[] {
  if (typeof rawWorkItem.id !== 'number') {
    return [];
  }

  return (rawWorkItem.relations ?? [])
    .filter(isArtifactLinkRelation)
    .flatMap((relation) => {
      const reference = parsePullRequestArtifactReference(
        relation.url,
        rawWorkItem.id!,
        requestedAncestorId,
        linkSource,
      );
      return reference === null ? [] : [reference];
    });
}

function accumulateCandidateReferences(references: readonly PullRequestArtifactReference[]): CandidateAccumulator[] {
  const candidatesByKey = new Map<string, CandidateAccumulator>();

  for (const reference of references) {
    const key = `${reference.repositoryId}:${reference.pullRequestId}`;
    const existing = candidatesByKey.get(key);

    if (existing === undefined) {
      candidatesByKey.set(key, {
        reference,
        relatedWorkItemIds: new Set<number>([reference.linkedWorkItemId]),
        requestedWorkItemIds: new Set<number>([reference.requestedAncestorId]),
        childWorkItemIds: reference.linkSource === 'child' ? new Set<number>([reference.linkedWorkItemId]) : new Set<number>(),
      });
      continue;
    }

    existing.relatedWorkItemIds.add(reference.linkedWorkItemId);
    existing.requestedWorkItemIds.add(reference.requestedAncestorId);
    if (reference.linkSource === 'child') {
      existing.childWorkItemIds.add(reference.linkedWorkItemId);
    }
  }

  return [...candidatesByKey.values()];
}

function normalizePullRequestStatus(status: PullRequestStatus | undefined): string {
  switch (status) {
    case PullRequestStatus.Active:
      return 'active';
    case PullRequestStatus.Abandoned:
      return 'abandoned';
    case PullRequestStatus.Completed:
      return 'completed';
    default:
      return 'not_set';
  }
}

function getDisplayName(value: { displayName?: string; uniqueName?: string } | undefined): string | null {
  if (typeof value?.displayName === 'string' && value.displayName.trim().length > 0) {
    return value.displayName.trim();
  }

  if (typeof value?.uniqueName === 'string' && value.uniqueName.trim().length > 0) {
    return value.uniqueName.trim();
  }

  return null;
}

function toIsoString(value: Date | string | undefined): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
}

function getCommitId(value: { commitId?: string } | undefined): string | null {
  if (typeof value?.commitId === 'string' && value.commitId.trim().length > 0) {
    return value.commitId.trim();
  }

  return null;
}

function buildPullRequestUrl(pullRequest: GitPullRequest, reference: PullRequestArtifactReference, orgUrl: string): string {
  if (typeof pullRequest.url === 'string' && pullRequest.url.trim().length > 0) {
    return pullRequest.url;
  }

  return `${orgUrl}/${reference.projectId}/_git/${reference.repositoryId}/pullrequest/${reference.pullRequestId}`;
}

async function hydrateCandidates(
  client: AzureDevOpsClient,
  candidateAccumulators: readonly CandidateAccumulator[],
): Promise<PullRequestCandidate[]> {
  const gitApi = await client.getGitApi();

  return Promise.all(
    candidateAccumulators.map(async (candidate) => {
      let pullRequest: GitPullRequest;

      try {
        pullRequest = await gitApi.getPullRequest(
          candidate.reference.repositoryId,
          candidate.reference.pullRequestId,
          candidate.reference.projectId,
          undefined,
          undefined,
          undefined,
          false,
          false,
        );
      } catch (error) {
        throw new Error(`Azure DevOps pull request API error: ${getAzureDevOpsErrorMessage(error)}`);
      }

      return {
        repositoryId: pullRequest.repository?.id ?? candidate.reference.repositoryId,
        pullRequestId: pullRequest.pullRequestId ?? candidate.reference.pullRequestId,
        title: typeof pullRequest.title === 'string' ? pullRequest.title : '',
        author: getDisplayName(pullRequest.createdBy),
        status: normalizePullRequestStatus(pullRequest.status),
        targetBranch: typeof pullRequest.targetRefName === 'string' ? pullRequest.targetRefName : '',
        mergedDate: toIsoString(pullRequest.closedDate),
        url: buildPullRequestUrl(pullRequest, candidate.reference, client.config.orgUrl),
        hashes: {
          mergeCommit: getCommitId(pullRequest.lastMergeCommit),
          sourceCommit: getCommitId(pullRequest.lastMergeSourceCommit),
          targetCommit: getCommitId(pullRequest.lastMergeTargetCommit),
        },
        relatedWorkItemIds: [...candidate.relatedWorkItemIds].sort((left, right) => left - right),
        requestedWorkItemIds: [...candidate.requestedWorkItemIds].sort((left, right) => left - right),
        childWorkItemIds: [...candidate.childWorkItemIds].sort((left, right) => left - right),
      };
    }),
  );
}

function buildFacets(candidates: readonly PullRequestCandidate[]): PullRequestFilterFacets {
  return {
    authors: Array.from(new Set(candidates.flatMap((candidate) => (candidate.author === null ? [] : [candidate.author])))).sort(),
    targetBranches: Array.from(new Set(candidates.map((candidate) => candidate.targetBranch).filter(Boolean))).sort(),
    statuses: Array.from(new Set(candidates.map((candidate) => candidate.status).filter(Boolean))).sort(),
    sortFields: ['mergedDate', 'pullRequestId'],
    totalPullRequests: candidates.length,
  };
}

function buildQuestions(facets: PullRequestFilterFacets): RefinementQuestion[] {
  return [
    {
      key: 'authors',
      prompt: 'Filter by which authors?',
      options: facets.authors,
      allowSkip: true,
      multiSelect: true,
    },
    {
      key: 'targetBranches',
      prompt: 'Filter by which target branches?',
      options: facets.targetBranches,
      allowSkip: true,
      multiSelect: true,
    },
    {
      key: 'statuses',
      prompt: 'Filter by which pull request statuses?',
      options: facets.statuses,
      allowSkip: true,
      multiSelect: true,
    },
    {
      key: 'sortBy',
      prompt: 'Sort the final result by which field?',
      options: facets.sortFields,
      allowSkip: true,
      multiSelect: false,
    },
  ];
}

function sortCandidates(
  candidates: readonly PullRequestCandidate[],
  sortBy: PullRequestSortField,
  sortDirection: 'asc' | 'desc',
): PullRequestCandidate[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...candidates].sort((left, right) => {
    if (sortBy === 'mergedDate') {
      const leftValue = left.mergedDate ?? '';
      const rightValue = right.mergedDate ?? '';
      const comparison = leftValue.localeCompare(rightValue);
      if (comparison !== 0) {
        return comparison * multiplier;
      }
    }

    return (left.pullRequestId - right.pullRequestId) * multiplier;
  });
}

function normalizeFilterValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeBranchName(value: string | null | undefined): string {
  return normalizeFilterValue(value).replace(/^refs\/heads\//, '');
}

function matchesAuthorFilter(candidateAuthor: string | null, requestedAuthors: readonly string[]): boolean {
  const normalizedAuthor = normalizeFilterValue(candidateAuthor);
  if (normalizedAuthor.length === 0) {
    return false;
  }

  return requestedAuthors
    .map((author) => normalizeFilterValue(author))
    .filter(Boolean)
    .some((author) => normalizedAuthor === author || normalizedAuthor.includes(author));
}

function matchesStatusFilter(candidateStatus: string, requestedStatuses: readonly string[]): boolean {
  const normalizedStatus = normalizeFilterValue(candidateStatus);

  return requestedStatuses
    .map((status) => normalizeFilterValue(status))
    .filter(Boolean)
    .includes(normalizedStatus);
}

function matchesTargetBranchFilter(candidateTargetBranch: string, requestedBranches: readonly string[]): boolean {
  const normalizedBranch = normalizeBranchName(candidateTargetBranch);

  return requestedBranches
    .map((branch) => normalizeBranchName(branch))
    .filter(Boolean)
    .includes(normalizedBranch);
}

function filterCandidates(
  candidates: readonly PullRequestCandidate[],
  request: WorkItemPullRequestLookupRequest,
): PullRequestCandidate[] {
  return candidates.filter((candidate) => {
    if (request.authors?.length && !matchesAuthorFilter(candidate.author, request.authors)) {
      return false;
    }

    if (request.targetBranches?.length && !matchesTargetBranchFilter(candidate.targetBranch, request.targetBranches)) {
      return false;
    }

    if (request.statuses?.length && !matchesStatusFilter(candidate.status, request.statuses)) {
      return false;
    }

    return true;
  });
}

function buildCherryPickPlan(candidates: readonly PullRequestCandidate[]): PullRequestCherryPickPlan {
  const commitHashes: string[] = [];
  const skippedPullRequestIds: number[] = [];

  for (const candidate of candidates) {
    const mergeCommitHash = candidate.hashes.mergeCommit;

    if (mergeCommitHash !== null) {
      commitHashes.push(mergeCommitHash);
      continue;
    }

    skippedPullRequestIds.push(candidate.pullRequestId);
  }

  return {
    commitHashes,
    command: commitHashes.length > 0 ? `git cherry-pick -m 1 ${commitHashes.join(' ')}` : null,
    skippedPullRequestIds,
  };
}

function hasRefinementInputs(request: WorkItemPullRequestLookupRequest): boolean {
  return Boolean(
    request.confirmUnfiltered ||
      request.authors?.length ||
      request.targetBranches?.length ||
      request.statuses?.length ||
      request.sortBy ||
      request.sortDirection,
  );
}

export async function getWorkItemPullRequests(
  client: AzureDevOpsClient,
  request: WorkItemPullRequestLookupRequest,
): Promise<PullRequestLookupResponse> {
  const requestedLookup = await resolveRawWorkItemsByIds(client, request.ids);
  const requestedWorkItems = [...requestedLookup.workItemsById.values()];
  const descendantWorkItemsById = await collectDescendantWorkItems(client, requestedWorkItems);
  const descendantAncestorMap = collectDescendantAncestorMap(requestedWorkItems, descendantWorkItemsById);

  const requestedReferences = requestedWorkItems.flatMap((workItem) =>
    collectArtifactReferences(workItem, workItem.id!, 'requested'),
  );
  const childReferences = [...descendantWorkItemsById.values()].flatMap((childWorkItem) => {
      const ancestors = descendantAncestorMap.get(childWorkItem.id!);
      if (ancestors === undefined) {
        return [];
      }

      return [...ancestors].flatMap((ancestorId) => collectArtifactReferences(childWorkItem, ancestorId, 'child'));
    });

  const candidateAccumulators = accumulateCandidateReferences([...requestedReferences, ...childReferences]);
  const hydratedCandidates = await hydrateCandidates(client, candidateAccumulators);
  const filteredCandidates = filterCandidates(hydratedCandidates, request);
  const sortedCandidates = sortCandidates(
    filteredCandidates,
    request.sortBy ?? DEFAULT_SORT_FIELD,
    request.sortDirection ?? 'asc',
  );

  if (!hasRefinementInputs(request)) {
    const facets = buildFacets(hydratedCandidates);
    return {
      stage: 'needs_refinement',
      requestedCount: requestedLookup.request.entries.length,
      candidateTotal: hydratedCandidates.length,
      matchingTotal: hydratedCandidates.length,
      issues: requestedLookup.issues,
      cherryPick: null,
      facets,
      questions: buildQuestions(facets),
      results: null,
    };
  }

  return {
    stage: 'complete',
    requestedCount: requestedLookup.request.entries.length,
    candidateTotal: hydratedCandidates.length,
    matchingTotal: sortedCandidates.length,
    issues: requestedLookup.issues,
    cherryPick: buildCherryPickPlan(sortedCandidates),
    facets: null,
    questions: null,
    results: sortedCandidates,
  };
}