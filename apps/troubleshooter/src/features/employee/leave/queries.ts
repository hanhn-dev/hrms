import { getEmployeeLeaveBalances as getEmployeeLeaveBalancesFromDb } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { LeaveBalanceRow } from "@hrms/db";

export async function getEmployeeLeaveBalances(
  employerId: number,
  employmentNumber: string,
) {
  await requireRootAdmin();
  return getEmployeeLeaveBalancesFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
