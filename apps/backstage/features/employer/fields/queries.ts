import {
  listEmployerFields as listEmployerFieldsFromDb,
  listEmployerFieldsForCompare as listEmployerFieldsForCompareFromDb,
  listFieldTemplate as listFieldTemplateFromDb,
  listFieldTemplateForCompare as listFieldTemplateForCompareFromDb,
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

export async function listEmployerFields(
  employerId: number,
  filters: { page?: number | null; q?: string | null; section?: string | null } = {},
) {
  await requireFeature("employers");
  return listEmployerFieldsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listEmployerFieldsForCompare(
  employerId: number,
  filters: { q?: string | null; section?: string | null },
) {
  await requireFeature("employers");
  return listEmployerFieldsForCompareFromDb(await getHrmsDb(), employerId, filters);
}

export async function listFieldTemplate(
  filters: { page?: number | null; q?: string | null; section?: string | null } = {},
) {
  await requireFeature("employers");
  return listFieldTemplateFromDb(await getHrmsDb(), filters);
}

export async function listFieldTemplateForCompare(filters: {
  q?: string | null;
  section?: string | null;
}) {
  await requireFeature("employers");
  return listFieldTemplateForCompareFromDb(await getHrmsDb(), filters);
}

export async function listFieldTypes() {
  await requireFeature("employers");
  return listFieldTypesFromDb(await getHrmsDb());
}

export async function listPublicEmployerFields(
  employerId: number,
  filters: { page?: number | null; q?: string | null; section?: string | null } = {},
) {
  await requireFeature("employers");
  return listPublicEmployerFieldsFromDb(await getHrmsDb(), employerId, filters);
}
