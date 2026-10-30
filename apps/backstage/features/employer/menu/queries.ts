"use server";

import {
  getEmployerMenu as getEmployerMenuFromDb,
  getMenuDiagnosis as getMenuDiagnosisFromDb,
  listCopyTargets as listCopyTargetsFromDb,
  listTemplateMenus as listTemplateMenusFromDb,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  CopyTargetRow,
  EmployerMenu,
  MenuDiagnosis,
  TemplateMenuRow,
} from "@hrms/db";

export async function getMenuDiagnosis(employerId: number) {
  await requireFeature("employers");
  return getMenuDiagnosisFromDb(await getHrmsDb(), employerId);
}

export async function getEmployerMenu(employerId: number) {
  await requireFeature("employers");
  return getEmployerMenuFromDb(await getHrmsDb(), employerId);
}

export async function searchTemplateMenus(employerId: number, q: string) {
  await requireFeature("employers");
  return listTemplateMenusFromDb(await getHrmsDb(), employerId, { q });
}

export async function searchCopyTargets(q: string) {
  await requireFeature("employers");
  return listCopyTargetsFromDb(await getHrmsDb(), { q });
}
