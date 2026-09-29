import {
  requireResolvedEmployee as requireResolvedEmployeeFromDb,
  resolveEmployee as resolveEmployeeFromDb,
  type ResolvedEmployee,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { ResolvedEmployee };

export async function resolveEmployee(
  employerId: number,
  employmentNumber: string,
): Promise<ResolvedEmployee | null> {
  return resolveEmployeeFromDb(await getHrmsDb(), employerId, employmentNumber);
}

export async function getEmployeeShellLabel(
  employerId: number,
  employmentNumber: string,
): Promise<string | null> {
  await requireRootAdmin();
  const employee = await resolveEmployee(employerId, employmentNumber);
  if (!employee) {
    return null;
  }
  return `${employee.fullName} · ${employee.employmentNumber}`;
}

export async function requireResolvedEmployee(
  employerId: number,
  employmentNumber: string,
): Promise<ResolvedEmployee> {
  return requireResolvedEmployeeFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}
