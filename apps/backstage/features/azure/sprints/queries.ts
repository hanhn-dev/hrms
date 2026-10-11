"use server";

import {
  getIterationWorkItems as getIterationWorkItemsFromAzure,
  listTeamIterations,
  type TeamIteration,
  type WorkItemSummary,
} from "@hrms/azure-devops";
import { requireRootAdmin } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { TeamIteration, WorkItemSummary };

export async function listIterations(): Promise<TeamIteration[]> {
  await requireRootAdmin();
  return listTeamIterations(getAzureDevOpsClient());
}

export async function listIterationWorkItems(
  iterationPath: string,
): Promise<WorkItemSummary[]> {
  await requireRootAdmin();
  const client = getAzureDevOpsClient();
  return getIterationWorkItemsFromAzure(client, iterationPath, client.config);
}
