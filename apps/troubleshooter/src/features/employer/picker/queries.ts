import { getDatabaseHealth as getDatabaseHealthFromDb, listEmployers as listEmployersFromDb } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployerListItem } from "@hrms/db";

export async function listEmployers() {
  await requireRootAdmin();
  return listEmployersFromDb(await getHrmsDb());
}

export async function getDatabaseHealth() {
  await requireRootAdmin();
  return getDatabaseHealthFromDb(await getHrmsDb());
}
