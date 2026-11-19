"use server";

import {
  getIterationWorkItems as getIterationWorkItemsFromAzure,
  getWorkItemsByIds,
  listProjectTeams,
  listTeamIterations,
  searchWorkItems,
  type ProjectTeam,
  type TeamIteration,
  type TeamIterationTimeframe,
  type WorkItem,
  type WorkItemSummary,
} from "@hrms/azure-devops";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { ProjectTeam, TeamIteration, TeamIterationTimeframe, WorkItemSummary };

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
    effort: item.effort,
    hasDescription: item.description.trim().length > 0,
    hasAcceptanceCriteria: item.acceptanceCriteria.trim().length > 0,
    url: item.url,
  };
}

/** Same as Progress: pull parent PBIs referenced by children but missing from the sprint page. */
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

export async function listTeams(): Promise<ProjectTeam[]> {
  await requireFeature("azure");
  return listProjectTeams(getAzureDevOpsClient());
}

export async function listIterations(options?: {
  team?: string;
}): Promise<TeamIteration[]> {
  await requireFeature("azure");
  const team = options?.team?.trim();
  return listTeamIterations(
    getAzureDevOpsClient(),
    undefined,
    team && team.length > 0 ? team : undefined,
  );
}

export async function listIterationWorkItems(
  iterationPath: string,
  query?: string,
): Promise<WorkItemSummary[]> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const search = query?.trim() ?? "";
  if (search.length > 0) {
    const numericId = /^\d+$/.test(search) ? Number(search) : null;
    const matches = await searchWorkItems(
      client,
      {
        iteration: iterationPath,
        top: 50,
        ...(numericId !== null && Number.isSafeInteger(numericId)
          ? { ids: [numericId] }
          : { titleContains: search }),
      },
      client.config,
    );
    const parents = await loadMissingParents(matches);
    return parents.length === 0 ? matches : [...matches, ...parents];
  }
  const workItems = await getIterationWorkItemsFromAzure(
    client,
    iterationPath,
    client.config,
  );
  const parents = await loadMissingParents(workItems);
  return parents.length === 0 ? workItems : [...workItems, ...parents];
}
