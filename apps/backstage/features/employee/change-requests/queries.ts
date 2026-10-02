import {
  listEmployeeChangeRequests as listEmployeeChangeRequestsFromDb,
  resolveEmployee,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { ChangeRequestDetail, ChangeRequestListItem } from "@hrms/db";

export async function listEmployeeChangeRequests(
  employerId: number,
  employmentNumber: string,
) {
  await requireRootAdmin();
  const db = await getHrmsDb();
  const identity = await resolveEmployee(db, employerId, employmentNumber);
  if (!identity) {
    return null;
  }
  return listEmployeeChangeRequestsFromDb(db, employerId, identity.employeeId);
}
