"use server";

import { requireFeature } from "@/shared/auth";
import { listConfiguredEnvironments } from "@/shared/db";

export async function getCompareEnvironments(): Promise<string[]> {
  await requireFeature("dbs");
  return listConfiguredEnvironments();
}
