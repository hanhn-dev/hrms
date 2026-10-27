import { getEmployeeLeaveBalances as getEmployeeLeaveBalancesFromDb } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { LeaveBalanceRow } from "@hrms/db";

export async function getEmployeeLeaveBalances(
  employerId: number,
  employmentNumber: string,
) {
  await requireFeature("employers");
  return getEmployeeLeaveBalancesFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
