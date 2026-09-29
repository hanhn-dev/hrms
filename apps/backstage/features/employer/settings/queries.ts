import {
  getCustomerSettings as getCustomerSettingsFromDb,
  getEmployerSettings as getEmployerSettingsFromDb,
  listLicensedModules as listLicensedModulesFromDb,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  CustomerSettingsRow,
  EmployerSettings,
  LicensedModule,
} from "@hrms/db";

export async function getEmployerSettings(employerId: number) {
  await requireRootAdmin();
  return getEmployerSettingsFromDb(await getHrmsDb(), employerId);
}

export async function listLicensedModules(employerId: number) {
  await requireRootAdmin();
  return listLicensedModulesFromDb(await getHrmsDb(), employerId);
}

export async function getCustomerSettings(employerId: number) {
  await requireRootAdmin();
  return getCustomerSettingsFromDb(await getHrmsDb(), employerId);
}
