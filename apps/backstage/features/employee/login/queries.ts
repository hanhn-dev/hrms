import { getEmployeeLoginInfo as getEmployeeLoginInfoFromDb } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployeeLoginInfo, FailedLoginAttempt } from "@hrms/db";

export async function getEmployeeLoginInfo(
  employerId: number,
  employmentNumber: string,
) {
  await requireRootAdmin();
  return getEmployeeLoginInfoFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
