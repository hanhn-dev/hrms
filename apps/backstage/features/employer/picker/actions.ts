"use server";

import { searchEmployers } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export async function searchEmployerOptions(
  q: string,
): Promise<Array<{ employerId: number; employerName: string }>> {
  await requireFeature("employers");
  return searchEmployers(await getHrmsDb(), q);
}
