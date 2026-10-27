import { listEmployeeApprovers as listEmployeeApproversFromDb } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  EmployeeApproverPerson,
  EmployeeApproverRow,
  EmployeeApprovers,
} from "@hrms/db";

export async function listEmployeeApprovers(
  employerId: number,
  employmentNumber: string,
) {
  await requireFeature("employers");
  return listEmployeeApproversFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
