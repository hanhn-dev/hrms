import { listEmployeeApprovers as listEmployeeApproversFromDb } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
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
  await requireRootAdmin();
  return listEmployeeApproversFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
