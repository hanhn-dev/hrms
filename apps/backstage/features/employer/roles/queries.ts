import {
  getRoleLocationBuScope as getRoleLocationBuScopeFromDb,
  listEmployerBusinessUnits as listEmployerBusinessUnitsFromDb,
  listEmployerLocations as listEmployerLocationsFromDb,
  listRolePageGrants as listRolePageGrantsFromDb,
  listRoles as listRolesFromDb,
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

export async function listRoles(employerId: number) {
  await requireFeature("employers");
  return listRolesFromDb(await getHrmsDb(), employerId);
}

export async function listRolePageGrants(
  employerId: number,
  roleId: number | null,
) {
  await requireFeature("employers");
  return listRolePageGrantsFromDb(await getHrmsDb(), employerId, roleId);
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
  const [locations, businessUnits] = await Promise.all([
    listEmployerLocationsFromDb(db, employerId),
    listEmployerBusinessUnitsFromDb(db, employerId),
  ]);
  return {
    locations: withMissingLocationOptions(locations, selectedLocationIds),
    businessUnits: withMissingBusinessUnitOptions(
      businessUnits,
      selectedBusinessUnitIds,
    ),
  };
}
