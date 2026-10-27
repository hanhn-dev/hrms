import {
  getWorkflow as getWorkflowFromDb,
  getWorkflowSettings as getWorkflowSettingsFromDb,
  listChangeRequests as listChangeRequestsFromDb,
  listLicensedModules,
  listMappablePages as listMappablePagesFromDb,
  listWorkflowBusinessUnits as listWorkflowBusinessUnitsFromDb,
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

export async function listWorkflows(employerId: number) {
  await requireFeature("employers");
  return listWorkflowsFromDb(await getHrmsDb(), employerId);
}

export async function getWorkflowSettings(employerId: number) {
  await requireFeature("employers");
  return getWorkflowSettingsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowPages(employerId: number) {
  await requireFeature("employers");
  return listWorkflowPagesFromDb(await getHrmsDb(), employerId);
}

export async function listMappablePages(employerId: number) {
  await requireFeature("employers");
  return listMappablePagesFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowGroups(employerId: number) {
  await requireFeature("employers");
  return listWorkflowGroupsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowLocations(employerId: number) {
  await requireFeature("employers");
  return listWorkflowLocationsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowBusinessUnits(employerId: number) {
  await requireFeature("employers");
  return listWorkflowBusinessUnitsFromDb(await getHrmsDb(), employerId);
}

export async function getWorkflow(employerId: number, workflowId: number) {
  await requireFeature("employers");
  return getWorkflowFromDb(await getHrmsDb(), employerId, workflowId);
}

export async function listWorkflowModules(employerId: number) {
  await requireFeature("employers");
  return listLicensedModules(await getHrmsDb(), employerId);
}

export async function listChangeRequests(employerId: number) {
  await requireFeature("employers");
  return listChangeRequestsFromDb(await getHrmsDb(), employerId);
}
