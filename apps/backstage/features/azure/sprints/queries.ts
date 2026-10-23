"use server";

import {
  getIterationWorkItems as getIterationWorkItemsFromAzure,
  listProjectTeams,
  listTeamIterations,
  type ProjectTeam,
  type TeamIteration,
  type TeamIterationTimeframe,
  type WorkItemSummary,
} from "@hrms/azure-devops";
import { requireRootAdmin } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { ProjectTeam, TeamIteration, TeamIterationTimeframe, WorkItemSummary };

export async function listTeams(): Promise<ProjectTeam[]> {
  await requireRootAdmin();
  return listProjectTeams(getAzureDevOpsClient());
}

export async function listIterations(options?: {
  team?: string;
}): Promise<TeamIteration[]> {
  await requireRootAdmin();
  const team = options?.team?.trim();
  return listTeamIterations(
    getAzureDevOpsClient(),
    undefined,
    team && team.length > 0 ? team : undefined,
  );
}

export async function listIterationWorkItems(
  iterationPath: string,
): Promise<WorkItemSummary[]> {
  await requireRootAdmin();
  const client = getAzureDevOpsClient();
  return getIterationWorkItemsFromAzure(client, iterationPath, client.config);
}
