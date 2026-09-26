import { loadEmployeeAccess } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";
import { requireResolvedEmployee } from "@/shared/employee";

export type { AccessNode, MenuAccessRow, TabAccessRow } from "@hrms/db";

export async function getEmployeeAccess(
  employerId: number,
  employmentNumber: string,
) {
  await requireRootAdmin();
  const identity = await requireResolvedEmployee(employerId, employmentNumber);
  const access = await loadEmployeeAccess(await getHrmsDb(), {
    employerId,
    userId: identity.userId,
    roleId: identity.roleId,
  });
  return {
    ...access,
    userId: identity.userId,
    roleId: identity.roleId,
    roleName: identity.roleName,
  };
}
