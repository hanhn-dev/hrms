"use server";

import {
  listWorkflowBusinessUnits,
  listWorkflowLocations,
  type WorkflowScopeOption,
} from "@/features/employer/workflows/queries";

export async function searchWorkflowLocations(
  employerId: number,
  q: string,
  includeIds: readonly number[],
): Promise<WorkflowScopeOption[]> {
  return listWorkflowLocations(employerId, { q, includeIds });
}

export async function searchWorkflowBusinessUnits(
  employerId: number,
  q: string,
  includeIds: readonly number[],
): Promise<WorkflowScopeOption[]> {
  return listWorkflowBusinessUnits(employerId, { q, includeIds });
}
