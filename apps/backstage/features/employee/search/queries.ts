import { searchEmployees as searchEmployeesFromDb } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployeeSearchHit, EmployeeSearchResult } from "@hrms/db";

export async function searchEmployees(
  employerId: number,
  search: string,
  page?: number | null,
) {
  await requireFeature("employers");
  return searchEmployeesFromDb(await getHrmsDb(), employerId, search, page);
}
