import type { PullRequestCandidate, PullRequestDateField, PullRequestSearchCriteria } from './types.js';

export type { PullRequestDateField, PullRequestSearchCriteria };

export {
  PULL_REQUEST_SEARCH_LIMIT,
  PULL_REQUEST_STATUS_OPTIONS,
  WORK_ITEM_STATE_OPTIONS,
  WORK_ITEM_TYPE_OPTIONS,
} from './types.js';

export function emptyPullRequestSearchCriteria(): PullRequestSearchCriteria {
  return {
    workItemIds: '',
    areaPaths: [],
    types: [],
    states: [],
    iterationPath: '',
    assignees: [],
    tags: '',
    titleContains: '',
    dateField: 'opened',
    dateFrom: null,
    dateTo: null,
    authorIds: [],
    statuses: [],
  };
}

function filled(values: readonly string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

export function isPullRequestSearchCriteriaEmpty(criteria: PullRequestSearchCriteria): boolean {
  return (
    criteria.workItemIds.trim().length === 0 &&
    !filled(criteria.areaPaths) &&
    !filled(criteria.types) &&
    !filled(criteria.states) &&
    criteria.iterationPath.trim().length === 0 &&
    !filled(criteria.assignees) &&
    criteria.tags.trim().length === 0 &&
    criteria.titleContains.trim().length === 0 &&
    criteria.dateFrom === null &&
    criteria.dateTo === null &&
    !filled(criteria.authorIds) &&
    !filled(criteria.statuses)
  );
}

export function hasWorkItemSearchCriteria(criteria: PullRequestSearchCriteria): boolean {
  return criteria.workItemIds.trim().length > 0 || hasWorkItemFieldCriteria(criteria);
}

export function hasWorkItemFieldCriteria(criteria: PullRequestSearchCriteria): boolean {
  return (
    filled(criteria.areaPaths) ||
    filled(criteria.types) ||
    filled(criteria.states) ||
    criteria.iterationPath.trim().length > 0 ||
    filled(criteria.assignees) ||
    criteria.tags.trim().length > 0 ||
    criteria.titleContains.trim().length > 0
  );
}

function dateOnly(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function matchesDate(
  candidate: PullRequestCandidate,
  dateField: PullRequestDateField,
  dateFrom: string | null,
  dateTo: string | null,
): boolean {
  if (dateFrom === null && dateTo === null) {
    return true;
  }

  const day = dateOnly(dateField === 'merged' ? candidate.mergedDate : candidate.openedDate);
  if (day === null) {
    return false;
  }

  if (dateFrom !== null && day < dateFrom) {
    return false;
  }

  if (dateTo !== null && day > dateTo) {
    return false;
  }

  return true;
}

/**
 * AND across author, status, and date. Values inside author and status are OR.
 * A merged range drops pull requests that have no closed date.
 */
export function filterPullRequestCandidates(
  candidates: readonly PullRequestCandidate[],
  criteria: PullRequestSearchCriteria,
): PullRequestCandidate[] {
  const authorIds = criteria.authorIds.map((id) => id.trim()).filter((id) => id.length > 0);
  const statuses = criteria.statuses.map((status) => status.trim().toLowerCase()).filter((status) => status.length > 0);

  return candidates.filter((candidate) => {
    if (authorIds.length > 0 && (candidate.authorId === null || !authorIds.includes(candidate.authorId))) {
      return false;
    }

    if (statuses.length > 0 && !statuses.includes(candidate.status)) {
      return false;
    }

    return matchesDate(candidate, criteria.dateField, criteria.dateFrom, criteria.dateTo);
  });
}

export function intersectWorkItemIds(pastedIds: readonly number[], matchedIds: readonly number[]): number[] {
  const matched = new Set(matchedIds);
  return pastedIds.filter((id) => matched.has(id));
}
