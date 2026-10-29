"use server";

import {
  getWorkflow as getWorkflowFromDb,
  getWorkflowSettings as getWorkflowSettingsFromDb,
  listChangeRequests as listChangeRequestsFromDb,
  listLicensedModules,
  listMappablePages as listMappablePagesFromDb,
  listWorkflowBusinessUnits as listWorkflowBusinessUnitsFromDb,
  listWorkflowActorGroups as listWorkflowActorGroupsFromDb,
  listWorkflowGroups as listWorkflowGroupsFromDb,
  listWorkflowLocations as listWorkflowLocationsFromDb,
  listWorkflowPages as listWorkflowPagesFromDb,
  listWorkflows as listWorkflowsFromDb,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  ChangeRequestDetail,
  ChangeRequestListItem,
  ConfiguredApproverGroup,
  LicensedModule,
  WorkflowDefinition,
  WorkflowGroupRow,
  WorkflowListItem,
  WorkflowPageCatalogRow,
  WorkflowScopeOption,
  WorkflowSettings,
  WorkflowTree,
} from "@hrms/db";

export async function listWorkflows(
  employerId: number,
  filters: { page?: number | null; q?: string | null } = {},
) {
  await requireFeature("employers");
  return listWorkflowsFromDb(await getHrmsDb(), employerId, filters);
}

export async function getWorkflowSettings(employerId: number) {
  await requireFeature("employers");
  return getWorkflowSettingsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowPages(
  employerId: number,
  filters: { page?: number | null; q?: string | null; name?: string | null } = {},
) {
  await requireFeature("employers");
  return listWorkflowPagesFromDb(await getHrmsDb(), employerId, filters);
}

export async function listMappablePages(employerId: number) {
  await requireFeature("employers");
  return listMappablePagesFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowGroups(
  employerId: number,
  filters: { page?: number | null; q?: string | null; roleId?: number | null } = {},
) {
  await requireFeature("employers");
  return listWorkflowGroupsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listWorkflowActorGroups(employerId: number) {
  await requireFeature("employers");
  return listWorkflowActorGroupsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowLocations(
  employerId: number,
  filters: { q?: string | null; includeIds?: readonly number[] } = {},
) {
  await requireFeature("employers");
  return listWorkflowLocationsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listWorkflowBusinessUnits(
  employerId: number,
  filters: { q?: string | null; includeIds?: readonly number[] } = {},
) {
  await requireFeature("employers");
  return listWorkflowBusinessUnitsFromDb(await getHrmsDb(), employerId, filters);
}

export async function getWorkflow(employerId: number, workflowId: number) {
  await requireFeature("employers");
  return getWorkflowFromDb(await getHrmsDb(), employerId, workflowId);
}

export async function listWorkflowModules(employerId: number) {
  await requireFeature("employers");
  return listLicensedModules(await getHrmsDb(), employerId);
}

export async function listChangeRequests(
  employerId: number,
  filters: {
    page?: number | null;
    q?: string | null;
    status?: "pending" | "approved" | "rejected" | "all" | null;
  } = {},
) {
  await requireFeature("employers");
  return listChangeRequestsFromDb(await getHrmsDb(), employerId, filters);
}
