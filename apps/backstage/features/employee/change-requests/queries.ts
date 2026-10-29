import {
  listEmployeeChangeRequests as listEmployeeChangeRequestsFromDb,
  resolveEmployee,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { ChangeRequestDetail, ChangeRequestListItem } from "@hrms/db";

export async function listEmployeeChangeRequests(
  employerId: number,
  employmentNumber: string,
  filters: {
    page?: number | null;
    q?: string | null;
    status?: "pending" | "approved" | "rejected" | "all" | null;
  } = {},
) {
  await requireFeature("employers");
  const db = await getHrmsDb();
  const identity = await resolveEmployee(db, employerId, employmentNumber);
  if (!identity) {
    return null;
  }
  return listEmployeeChangeRequestsFromDb(db, employerId, identity.employeeId, filters);
}
