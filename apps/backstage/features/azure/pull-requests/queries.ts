"use server";

import {
  emptyPullRequestSearchCriteria,
  listAreaModules,
  listTeamMembers,
  listTeamIterations,
  searchIdentities,
  searchPullRequests as searchPullRequestsInAzure,
  type AreaModule,
  type PullRequestSearchCriteria,
  type PullRequestSearchResult,
  type TeamIteration,
  type TeamMember,
} from "@hrms/azure-devops";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import {
  aggregatePullRequestsByMember,
  summarizeTeamPullRequests,
  toDateOnly,
  type MemberPullRequestProgress,
  type TeamPullRequestSummary,
} from "@/features/azure/pull-requests/aggregate-pull-requests";
import {
  getDonePullRequestIds as getDonePullRequestIdsFromStore,
  setPullRequestDone,
} from "@/features/azure/pull-requests/done-store";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { PullRequestSearchResult };

export type PullRequestSearchOptions = {
  readonly teamMembers: readonly TeamMember[];
  readonly modules: readonly AreaModule[];
  readonly iterations: readonly TeamIteration[];
};

export async function loadPullRequestSearchOptions(): Promise<PullRequestSearchOptions> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const team = client.config.team?.trim() || DEFAULT_BOARD_TEAM;
  const [teamMembers, iterations] = await Promise.all([
    listTeamMembers(client, team),
    listTeamIterations(client),
  ]);
  return { teamMembers, modules: [], iterations };
}

export async function loadPullRequestAreas(): Promise<AreaModule[]> {
  await requireFeature("azure");
  return listAreaModules(getAzureDevOpsClient());
}

export async function searchPullRequests(
  criteria: PullRequestSearchCriteria,
  skip = 0,
): Promise<PullRequestSearchResult> {
  await requireFeature("azure");
  return searchPullRequestsInAzure(getAzureDevOpsClient(), criteria, skip);
}

/** Which of the given pull request ids an operator has already marked done. */
export async function getDonePullRequestIds(
  pullRequestIds: readonly number[],
): Promise<number[]> {
  await requireFeature("azure");
  return getDonePullRequestIdsFromStore(pullRequestIds);
}

export async function markPullRequestDone(
  pullRequestId: number,
  done: boolean,
): Promise<void> {
  const session = await requireFeature("azure");
  setPullRequestDone(pullRequestId, done, session.name ?? session.email ?? null);
}

export async function listTrackingIterations(team: string): Promise<TeamIteration[]> {
  await requireFeature("azure");
  return listTeamIterations(getAzureDevOpsClient(), undefined, team);
}

export type TeamMemberPullRequestsData = {
  rows: MemberPullRequestProgress[];
  summary: TeamPullRequestSummary;
  unresolvedMembers: string[];
  truncated: boolean;
  missingDates: boolean;
  dateFrom: string | null;
  dateTo: string | null;
};

/**
 * Map local-team display names to classic Azure DevOps identity GUIDs
 * (`IdentityRef.id` / PR `creatorId`). Do **not** use Graph `originId` /
 * `descriptor` from `listProjectMembers` — those are a different namespace and
 * make `getPullRequestsByProject` return zero matches with no error.
 */
async function resolveMemberIdentities(
  members: readonly string[],
  azureTeam?: string,
): Promise<{
  roster: { displayName: string; authorId: string | null }[];
  unresolvedMembers: string[];
}> {
  const client = getAzureDevOpsClient();
  const byName = new Map<string, string>();

  try {
    const teamMembers = await listTeamMembers(client, azureTeam);
    for (const person of teamMembers) {
      byName.set(person.displayName, person.id);
      byName.set(person.displayName.toLowerCase(), person.id);
    }
  } catch {
    // Fall through to per-name identity search below.
  }

  const roster: { displayName: string; authorId: string | null }[] = [];
  const unresolvedMembers: string[] = [];

  for (const displayName of members) {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      continue;
    }
    let authorId = byName.get(trimmed) ?? byName.get(trimmed.toLowerCase()) ?? null;
    if (authorId == null && trimmed.length >= 2) {
      const hits = await searchIdentities(client, trimmed);
      const exact =
        hits.find((hit) => hit.displayName === trimmed) ??
        hits.find((hit) => hit.displayName.toLowerCase() === trimmed.toLowerCase()) ??
        null;
      if (exact != null) {
        authorId = exact.id;
        byName.set(exact.displayName, exact.id);
        byName.set(exact.displayName.toLowerCase(), exact.id);
      }
    }
    roster.push({ displayName: trimmed, authorId });
    if (authorId == null) {
      unresolvedMembers.push(trimmed);
    }
  }

  return { roster, unresolvedMembers };
}

export async function loadTeamMemberPullRequests(
  members: readonly string[],
  dateFrom: string | null,
  dateTo: string | null,
  azureTeam?: string,
): Promise<TeamMemberPullRequestsData> {
  await requireFeature("azure");
  const from = toDateOnly(dateFrom);
  const to = toDateOnly(dateTo);
  const missingDates = from == null && to == null;

  const { roster, unresolvedMembers } = await resolveMemberIdentities(members, azureTeam);
  const emptyRows = aggregatePullRequestsByMember(roster, []);
  const emptySummary = summarizeTeamPullRequests(emptyRows);

  if (missingDates || roster.length === 0) {
    return {
      rows: emptyRows,
      summary: emptySummary,
      unresolvedMembers,
      truncated: false,
      missingDates,
      dateFrom: from,
      dateTo: to,
    };
  }

  const authorIds = roster
    .map((entry) => entry.authorId)
    .filter((id): id is string => id != null && id.length > 0);

  const client = getAzureDevOpsClient();
  const baseCriteria = {
    ...emptyPullRequestSearchCriteria(),
    dateField: "opened" as const,
    dateFrom: from,
    dateTo: to,
  };

  let result =
    authorIds.length > 0
      ? await searchPullRequestsInAzure(client, { ...baseCriteria, authorIds })
      : await searchPullRequestsInAzure(client, { ...baseCriteria, authorIds: [] });

  // Wrong-namespace author ids return an empty set with no error. Fall back to a
  // project-wide opened-date search and match authors by display name.
  if (result.results.length === 0 && authorIds.length > 0) {
    result = await searchPullRequestsInAzure(client, { ...baseCriteria, authorIds: [] });
  }

  const rows = aggregatePullRequestsByMember(roster, result.results);
  return {
    rows,
    summary: summarizeTeamPullRequests(rows),
    unresolvedMembers,
    truncated: result.truncated,
    missingDates: false,
    dateFrom: from,
    dateTo: to,
  };
}
