import { searchEmployees as searchEmployeesFromDb } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployeeSearchHit } from "@hrms/db";

export async function searchEmployees(employerId: number, search: string) {
  await requireRootAdmin();
  return searchEmployeesFromDb(await getHrmsDb(), employerId, search);
}
