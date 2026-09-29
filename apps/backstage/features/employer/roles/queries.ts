import {
  listRolePageGrants as listRolePageGrantsFromDb,
  listRoles as listRolesFromDb,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { RolePageGrant, RoleRow } from "@hrms/db";

export async function listRoles(employerId: number) {
  await requireRootAdmin();
  return listRolesFromDb(await getHrmsDb(), employerId);
}

export async function listRolePageGrants(
  employerId: number,
  roleId: number | null,
) {
  await requireRootAdmin();
  return listRolePageGrantsFromDb(await getHrmsDb(), employerId, roleId);
}
