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

export type EmployeeShell = {
  fullName: string;
  employmentNumber: string;
};

export async function getEmployeeShell(
  employerId: number,
  employmentNumber: string,
): Promise<EmployeeShell | null> {
  await requireRootAdmin();
  const employee = await resolveEmployee(employerId, employmentNumber);
  if (!employee) {
    return null;
  }
  return {
    fullName: employee.fullName,
    employmentNumber: employee.employmentNumber,
  };
}

export async function getEmployeeShellLabel(
  employerId: number,
  employmentNumber: string,
): Promise<string | null> {
  const shell = await getEmployeeShell(employerId, employmentNumber);
  if (!shell) {
    return null;
  }
  return `${shell.fullName} · ${shell.employmentNumber}`;
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
