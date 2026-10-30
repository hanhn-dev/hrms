"use server";

import {
  getDatabaseHealth as getDatabaseHealthFromDb,
  listEmployers as listEmployersFromDb,
  searchEmployers as searchEmployersFromDb,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployerListItem, EmployerListPage, EmployerLookup } from "@hrms/db";

export async function listEmployers(
  filters: { page?: number | null; pageSize?: number | null; q?: string | null } = {},
) {
  await requireFeature("employers");
  return listEmployersFromDb(await getHrmsDb(), filters);
}

export async function searchEmployers(q?: string | null) {
  await requireFeature("employers");
  return searchEmployersFromDb(await getHrmsDb(), q);
}

export async function getDatabaseHealth() {
  await requireFeature("employers");
  return getDatabaseHealthFromDb(await getHrmsDb());
}
