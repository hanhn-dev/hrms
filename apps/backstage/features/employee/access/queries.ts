import {
  getEmployeeLocationBuScope,
  loadEmployeeAccess,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";
import { requireResolvedEmployee } from "@/shared/employee";

export type {
  AccessNode,
  EmployeeLocationBuScope,
  MenuAccessRow,
  TabAccessRow,
} from "@hrms/db";

export async function getEmployeeAccess(
  employerId: number,
  employmentNumber: string,
) {
  await requireRootAdmin();
  const identity = await requireResolvedEmployee(employerId, employmentNumber);
  const db = await getHrmsDb();
  const [access, locationBuScope] = await Promise.all([
    loadEmployeeAccess(db, {
      employerId,
      userId: identity.userId,
      roleId: identity.roleId,
    }),
    getEmployeeLocationBuScope(db, {
      employerId,
      employeeId: identity.employeeId,
      userId: identity.userId,
      roleId: identity.roleId,
    }),
  ]);
  return {
    ...access,
    userId: identity.userId,
    roleId: identity.roleId,
    roleName: identity.roleName,
    locationBuScope,
  };
}
