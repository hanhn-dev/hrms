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
import { requireRootAdmin } from "@/shared/auth";
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
  await requireRootAdmin();
  return listWorkflowsFromDb(await getHrmsDb(), employerId);
}

export async function getWorkflowSettings(employerId: number) {
  await requireRootAdmin();
  return getWorkflowSettingsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowPages(employerId: number) {
  await requireRootAdmin();
  return listWorkflowPagesFromDb(await getHrmsDb(), employerId);
}

export async function listMappablePages(employerId: number) {
  await requireRootAdmin();
  return listMappablePagesFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowGroups(employerId: number) {
  await requireRootAdmin();
  return listWorkflowGroupsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowLocations(employerId: number) {
  await requireRootAdmin();
  return listWorkflowLocationsFromDb(await getHrmsDb(), employerId);
}

export async function listWorkflowBusinessUnits(employerId: number) {
  await requireRootAdmin();
  return listWorkflowBusinessUnitsFromDb(await getHrmsDb(), employerId);
}

export async function getWorkflow(employerId: number, workflowId: number) {
  await requireRootAdmin();
  return getWorkflowFromDb(await getHrmsDb(), employerId, workflowId);
}

export async function listWorkflowModules(employerId: number) {
  await requireRootAdmin();
  return listLicensedModules(await getHrmsDb(), employerId);
}

export async function listChangeRequests(employerId: number) {
  await requireRootAdmin();
  return listChangeRequestsFromDb(await getHrmsDb(), employerId);
}
