"use server";

import {
  getIterationWorkItems,
  getWorkItemsByIds,
  listTeamIterations,
  listTeamMembers,
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
