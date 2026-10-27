import { getEmployeeProfile as getEmployeeProfileFromDb } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployeeProfile } from "@hrms/db";

export async function getEmployeeProfile(
  employerId: number,
  employmentNumber: string,
) {
  await requireFeature("employers");
  return getEmployeeProfileFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
