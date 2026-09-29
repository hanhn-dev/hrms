import {
  getEmployeeSectionCounts as getEmployeeSectionCountsFromDb,
  type EmployeeSectionCount,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployeeSectionCount };

export async function getEmployeeSectionCounts(
  employerId: number,
  employmentNumber: string,
): Promise<EmployeeSectionCount[]> {
  await requireRootAdmin();
  return getEmployeeSectionCountsFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
