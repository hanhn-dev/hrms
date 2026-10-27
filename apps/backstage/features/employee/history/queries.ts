import {
  loadEmployeeHistoryChanges,
  listHistorySectionOptions,
  resolveEmployee,
  type HistoryChangeResponse,
  type HistoryViewType,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { HistoryChangeResponse, HistoryChangeEvent } from "@hrms/db";

export async function getEmployeeHistoryChanges(
  employerId: number,
  employmentNumber: string,
  input: {
    type: HistoryViewType;
    section?: string | null;
    from?: string | null;
    to?: string | null;
    pageNumber?: number;
    pageSize?: number;
  },
): Promise<HistoryChangeResponse | null> {
  await requireFeature("employers");
  const db = await getHrmsDb();
  const identity = await resolveEmployee(db, employerId, employmentNumber);
  if (!identity) {
    return null;
  }
  return loadEmployeeHistoryChanges(db, {
    employerId,
    employeeId: identity.employeeId,
    type: input.type,
    section: input.section,
    from: input.from,
    to: input.to,
    pageNumber: input.pageNumber,
    pageSize: input.pageSize,
  });
}

export async function getHistorySectionOptions() {
  await requireFeature("employers");
  return listHistorySectionOptions();
}
