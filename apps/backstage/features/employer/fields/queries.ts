import {
  listEmployerFields as listEmployerFieldsFromDb,
  listFieldTemplate as listFieldTemplateFromDb,
  listFieldTypes as listFieldTypesFromDb,
  listPublicEmployerFields as listPublicEmployerFieldsFromDb,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  FieldCatalogRow,
  FieldCompareRow,
  FieldCompareStatus,
  FieldTypeOption,
  PublicFieldRow,
} from "@hrms/db";
export { compareEmployerFieldsToTemplate } from "@hrms/db";

export async function listEmployerFields(employerId: number) {
  await requireFeature("employers");
  return listEmployerFieldsFromDb(await getHrmsDb(), employerId);
}

export async function listFieldTemplate() {
  await requireFeature("employers");
  return listFieldTemplateFromDb(await getHrmsDb());
}

export async function listFieldTypes() {
  await requireFeature("employers");
  return listFieldTypesFromDb(await getHrmsDb());
}

export async function listPublicEmployerFields(employerId: number) {
  await requireFeature("employers");
  return listPublicEmployerFieldsFromDb(await getHrmsDb(), employerId);
}
