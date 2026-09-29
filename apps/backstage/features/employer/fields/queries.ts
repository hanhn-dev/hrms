import {
  listEmployerFields as listEmployerFieldsFromDb,
  listFieldTemplate as listFieldTemplateFromDb,
  listFieldTypes as listFieldTypesFromDb,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  FieldCatalogRow,
  FieldCompareRow,
  FieldCompareStatus,
  FieldTypeOption,
} from "@hrms/db";
export { compareEmployerFieldsToTemplate } from "@hrms/db";

export async function listEmployerFields(employerId: number) {
  await requireRootAdmin();
  return listEmployerFieldsFromDb(await getHrmsDb(), employerId);
}

export async function listFieldTemplate() {
  await requireRootAdmin();
  return listFieldTemplateFromDb(await getHrmsDb());
}

export async function listFieldTypes() {
  await requireRootAdmin();
  return listFieldTypesFromDb(await getHrmsDb());
}
