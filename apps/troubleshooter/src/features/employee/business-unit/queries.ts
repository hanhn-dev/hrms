import { listBusinessUnitEmployees as listBusinessUnitEmployeesFromDb } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { BusinessUnitEmployee, BusinessUnitEmployees } from "@hrms/db";

export async function listBusinessUnitEmployees(
  employerId: number,
  employmentNumber: string,
  search: string,
) {
  await requireRootAdmin();
  return listBusinessUnitEmployeesFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
    search,
  );
}
