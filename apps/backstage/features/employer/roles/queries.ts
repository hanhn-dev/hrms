"use server";

import {
  getRoleLocationBuScope as getRoleLocationBuScopeFromDb,
  listEmployerBusinessUnits as listEmployerBusinessUnitsFromDb,
  listEmployerLocations as listEmployerLocationsFromDb,
  listRolePageGrants as listRolePageGrantsFromDb,
  listRoles as listRolesFromDb,
  parseCommaIdList,
  withMissingBusinessUnitOptions,
  withMissingLocationOptions,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  EmployerBusinessUnitOption,
  EmployerLocationOption,
  RoleLocationBuScope,
  RolePageGrant,
  RoleRow,
} from "@hrms/db";

export async function listRoles(
  employerId: number,
  filters: { page?: number | null; pageSize?: number | null; q?: string | null } = {},
) {
  await requireFeature("employers");
  return listRolesFromDb(await getHrmsDb(), employerId, filters);
}

export async function listRolePageGrants(
  employerId: number,
  roleId: number | null,
  filters: { page?: number | null; pageSize?: number | null; q?: string | null } = {},
) {
  await requireFeature("employers");
  return listRolePageGrantsFromDb(await getHrmsDb(), employerId, roleId, filters);
}

export async function getRoleLocationBuScope(
  employerId: number,
  roleId: number | null,
) {
  await requireFeature("employers");
  if (roleId == null) {
    return null;
  }
  return getRoleLocationBuScopeFromDb(await getHrmsDb(), employerId, roleId);
}

export async function listRoleScopeOptions(
  employerId: number,
  selectedLocationIds: string | null | undefined,
  selectedBusinessUnitIds: string | null | undefined,
) {
  await requireFeature("employers");
  const db = await getHrmsDb();
  const locationIds = parseCommaIdList(selectedLocationIds);
  const businessUnitIds = parseCommaIdList(selectedBusinessUnitIds);
  const [locations, businessUnits] = await Promise.all([
    listEmployerLocationsFromDb(db, employerId, { includeIds: locationIds }),
    listEmployerBusinessUnitsFromDb(db, employerId, { includeIds: businessUnitIds }),
  ]);
  return {
    locations: withMissingLocationOptions(locations, selectedLocationIds),
    businessUnits: withMissingBusinessUnitOptions(
      businessUnits,
      selectedBusinessUnitIds,
    ),
  };
}

export async function searchRoleLocations(
  employerId: number,
  q: string,
  includeIds: readonly number[],
) {
  await requireFeature("employers");
  return listEmployerLocationsFromDb(await getHrmsDb(), employerId, {
    q,
    includeIds,
  });
}

export async function searchRoleBusinessUnits(
  employerId: number,
  q: string,
  includeIds: readonly number[],
) {
  await requireFeature("employers");
  return listEmployerBusinessUnitsFromDb(await getHrmsDb(), employerId, {
    q,
    includeIds,
  });
}

export async function listAllRoleLocations(employerId: number) {
  await requireFeature("employers");
  return listEmployerLocationsFromDb(await getHrmsDb(), employerId, { all: true });
}

export async function listAllRoleBusinessUnits(employerId: number) {
  await requireFeature("employers");
  return listEmployerBusinessUnitsFromDb(await getHrmsDb(), employerId, {
    all: true,
  });
}
