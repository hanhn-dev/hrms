"use server";

import { getChangeRequest, listConfiguredApprovers } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export async function getChangeRequestDetail(employerId: number, changeRequestId: number) {
  await requireRootAdmin();
  const db = await getHrmsDb();
  const [detail, approvers] = await Promise.all([
    getChangeRequest(db, employerId, changeRequestId),
    listConfiguredApprovers(db, employerId, changeRequestId),
  ]);
  if (!detail) {
    throw new Error("Change request was not found for this employer.");
  }
  return { detail, approvers };
}
