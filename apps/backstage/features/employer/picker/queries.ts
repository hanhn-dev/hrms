import { getDatabaseHealth as getDatabaseHealthFromDb, listEmployers as listEmployersFromDb } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployerListItem } from "@hrms/db";

export async function listEmployers() {
  await requireFeature("employers");
  return listEmployersFromDb(await getHrmsDb());
}

export async function getDatabaseHealth() {
  await requireFeature("employers");
  return getDatabaseHealthFromDb(await getHrmsDb());
}
