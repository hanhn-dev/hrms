"use server";

import { getWorkItemStateAges, type WorkItemStateAge } from "@hrms/azure-devops";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export type { WorkItemStateAge };

export async function loadStateAges(ids: readonly number[]): Promise<readonly WorkItemStateAge[]> {
  await requireFeature("azure");
  if (ids.length === 0) {
    return [];
  }
  return getWorkItemStateAges(getAzureDevOpsClient(), ids);
}
