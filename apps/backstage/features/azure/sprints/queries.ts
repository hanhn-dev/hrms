"use server";

import {
  getIterationWorkItems as getIterationWorkItemsFromAzure,
  listProjectTeams,
  listTeamIterations,
  searchWorkItems,
  type ProjectTeam,
  type TeamIteration,
  type TeamIterationTimeframe,
  type WorkItemSummary,
} from "@hrms/azure-devops";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { ProjectTeam, TeamIteration, TeamIterationTimeframe, WorkItemSummary };

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
    return searchWorkItems(
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
  }
  return getIterationWorkItemsFromAzure(client, iterationPath, client.config);
}
