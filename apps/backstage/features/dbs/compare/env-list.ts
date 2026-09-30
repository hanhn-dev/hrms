"use server";

import { requireRootAdmin } from "@/shared/auth";
import { listConfiguredEnvironments } from "@/shared/db";

export async function getCompareEnvironments(): Promise<string[]> {
  await requireRootAdmin();
  return listConfiguredEnvironments();
}
