import {
  getEmployeeProfile as getEmployeeProfileFromDb,
  listAccessibleEmployers as listAccessibleEmployersFromDb,
  type EmployeeProfile,
} from "@hrms/db";
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

export async function listAccessibleEmployers(
  profile: Pick<EmployeeProfile, "isGlobalAccess" | "employerIds" | "employerId">,
) {
  await requireFeature("employers");
  return listAccessibleEmployersFromDb(await getHrmsDb(), {
    isGlobalAccess: profile.isGlobalAccess,
    employerIds: profile.employerIds,
    ownEmployerId: profile.employerId,
  });
}
