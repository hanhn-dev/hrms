"use server";

import {
  emptyPullRequestSearchCriteria,
  getIterationWorkItems,
  getWorkItemsByIds,
  listTeamIterations,
  listTeamMembers,
  searchIdentities,
  searchPullRequests,
  type TeamIteration,
  type WorkItem,
  type WorkItemSummary,
} from "@hrms/azure-devops";
import { SPRINT_WORK_ITEM_CAP } from "@/features/azure/board/defaults";
import {
  buildVelocitySeries,
  filterMembers,
  groupByAssignee,
  pickVelocityIterations,
  type PersonProgress,
  type VelocitySeries,
} from "@/features/azure/progress/aggregate-progress";
import {
  aggregatePullRequestsByMember,
  summarizeTeamPullRequests,
  toDateOnly,
  type MemberPullRequestProgress,
  type TeamPullRequestSummary,
} from "@/features/azure/progress/aggregate-pull-requests";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export async function listIterations(team: string): Promise<TeamIteration[]> {
  await requireFeature("azure");
  return listTeamIterations(getAzureDevOpsClient(), undefined, team);
}

export type SprintProgressData = {
  rows: PersonProgress[];
  allWorkItems: WorkItemSummary[];
  truncated: boolean;
  workItemCount: number;
};

function toSummary(item: WorkItem): WorkItemSummary {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    state: item.state,
    assignedTo: item.assignedTo,
    tags: item.tags,
    changedDate: item.changedDate,
    iterationPath: item.iterationPath,
    parentId: item.parentId,
    hasDescription: item.description.trim().length > 0,
    hasAcceptanceCriteria: item.acceptanceCriteria.trim().length > 0,
    url: item.url,
  };
}

/** Load parent work items referenced by sprint children but missing from the capped sprint set. */
async function loadMissingParents(
  workItems: readonly WorkItemSummary[],
): Promise<WorkItemSummary[]> {
  const sprintIds = new Set(workItems.map((item) => item.id));
  const missingParentIds = [
    ...new Set(
      workItems
        .map((item) => item.parentId)
        .filter((id): id is number => id != null && !sprintIds.has(id)),
    ),
  ];
  if (missingParentIds.length === 0) {
    return [];
  }
  const client = getAzureDevOpsClient();
  const batch = await getWorkItemsByIds(client, missingParentIds.join(","));
  const parents: WorkItemSummary[] = [];
  for (const entry of batch.results) {
    if (entry.workItem != null) {
      parents.push(toSummary(entry.workItem));
    }
  }
  return parents;
}

export async function loadSprintProgress(
  team: string,
  iterationPath: string,
  members: readonly string[],
): Promise<SprintProgressData> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const [workItems, roster] = await Promise.all([
    getIterationWorkItems(client, iterationPath, client.config),
    listTeamMembers(client, team),
  ]);
  const parents = await loadMissingParents(workItems);
  const allWorkItems = parents.length === 0 ? workItems : [...workItems, ...parents];
  const rosterNames = roster.map((person) => person.displayName);
  const grouped = groupByAssignee(workItems, rosterNames);
  return {
    rows: filterMembers(grouped, members),
    allWorkItems,
    truncated: workItems.length >= SPRINT_WORK_ITEM_CAP,
    workItemCount: workItems.length,
  };
}

export type VelocityProgressData = {
  series: VelocitySeries;
  truncatedPaths: string[];
};

export async function loadVelocityProgress(
  team: string,
  members: readonly string[],
): Promise<VelocityProgressData> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const iterations = await listTeamIterations(client, undefined, team);
  const picked = pickVelocityIterations(iterations);
  const settled = await Promise.all(
    picked.map(async (iteration) => {
      const workItems = await getIterationWorkItems(client, iteration.path, client.config);
      return { path: iteration.path, workItems };
    }),
  );
  const itemsByPath = new Map<string, readonly WorkItemSummary[]>();
  const truncatedPaths: string[] = [];
  for (const entry of settled) {
    itemsByPath.set(entry.path, entry.workItems);
    if (entry.workItems.length >= SPRINT_WORK_ITEM_CAP) {
      truncatedPaths.push(entry.path);
    }
  }
  return {
    series: buildVelocitySeries(iterations, itemsByPath, members),
    truncatedPaths,
  };
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
      ? await searchPullRequests(client, { ...baseCriteria, authorIds })
      : await searchPullRequests(client, { ...baseCriteria, authorIds: [] });

  // Wrong-namespace author ids return an empty set with no error. Fall back to a
  // project-wide opened-date search and match authors by display name.
  if (result.results.length === 0 && authorIds.length > 0) {
    result = await searchPullRequests(client, { ...baseCriteria, authorIds: [] });
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
