"use server";

import {
  getIterationWorkItems,
  getWorkItemsByIds,
  listProjectTeams,
  listTaskboardColumns,
  listTaskboardWorkItemColumns,
  listTeamIterations,
  listTeamMembers,
  type ProjectTeam,
  type TaskboardColumn,
  type TaskboardWorkItemColumn,
  type TeamIteration,
  type TeamMember,
  type WorkItem,
  type WorkItemSummary,
} from "@hrms/azure-devops";
import { requireRootAdmin } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type SprintBoardData = {
  columns: TaskboardColumn[];
  placements: TaskboardWorkItemColumn[];
  workItems: WorkItemSummary[];
  parents: WorkItemSummary[];
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

export async function listTeams(): Promise<ProjectTeam[]> {
  await requireRootAdmin();
  return listProjectTeams(getAzureDevOpsClient());
}

export async function listIterations(team: string): Promise<TeamIteration[]> {
  await requireRootAdmin();
  return listTeamIterations(getAzureDevOpsClient(), undefined, team);
}

export async function listMembers(team: string): Promise<TeamMember[]> {
  await requireRootAdmin();
  return listTeamMembers(getAzureDevOpsClient(), team);
}

export async function loadSprintBoard(
  team: string,
  iterationId: string,
  iterationPath: string,
): Promise<SprintBoardData> {
  await requireRootAdmin();
  const client = getAzureDevOpsClient();
  const [columns, placements, workItems] = await Promise.all([
    listTaskboardColumns(client, team),
    listTaskboardWorkItemColumns(client, iterationId, team),
    getIterationWorkItems(client, iterationPath, client.config),
  ]);
  const sprintIds = new Set(workItems.map((item) => item.id));
  const missingParentIds = [
    ...new Set(
      workItems
        .map((item) => item.parentId)
        .filter((id): id is number => id != null && !sprintIds.has(id)),
    ),
  ];
  const parents: WorkItemSummary[] = [];
  if (missingParentIds.length > 0) {
    const batch = await getWorkItemsByIds(client, missingParentIds.join(","));
    for (const entry of batch.results) {
      if (entry.workItem != null) {
        parents.push(toSummary(entry.workItem));
      }
    }
  }
  return { columns, placements, workItems, parents };
}
