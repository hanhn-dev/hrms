import {
  listEmployerFieldSections as listEmployerFieldSectionsFromDb,
  listEmployerFields as listEmployerFieldsFromDb,
  listEmployerFieldsForCompare as listEmployerFieldsForCompareFromDb,
  listFieldTemplate as listFieldTemplateFromDb,
  listFieldTemplateForCompare as listFieldTemplateForCompareFromDb,
  listFieldTemplateSections as listFieldTemplateSectionsFromDb,
  listFieldTypes as listFieldTypesFromDb,
  listPublicEmployerFields as listPublicEmployerFieldsFromDb,
  listPublicFieldSections as listPublicFieldSectionsFromDb,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  FieldCatalogRow,
  FieldCompareRow,
  FieldCompareStatus,
  FieldSectionSummary,
  FieldTypeOption,
  PublicFieldRow,
} from "@hrms/db";
export { compareEmployerFieldsToTemplate } from "@hrms/db";

type FieldQueryFilters = {
  page?: number | null;
  q?: string | null;
  section?: string | null;
  entities?: readonly string[] | null;
};

export async function listEmployerFieldSections(
  employerId: number,
  filters: FieldQueryFilters = {},
) {
  await requireFeature("employers");
  return listEmployerFieldSectionsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listEmployerFields(
  employerId: number,
  filters: FieldQueryFilters = {},
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

export async function listFieldTemplateSections(filters: FieldQueryFilters = {}) {
  await requireFeature("employers");
  return listFieldTemplateSectionsFromDb(await getHrmsDb(), filters);
}

export async function listFieldTemplate(filters: FieldQueryFilters = {}) {
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

export async function listPublicFieldSections(
  employerId: number,
  filters: { q?: string | null; section?: string | null } = {},
) {
  await requireFeature("employers");
  return listPublicFieldSectionsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listPublicEmployerFields(
  employerId: number,
  filters: { page?: number | null; q?: string | null; section?: string | null } = {},
) {
  await requireFeature("employers");
  return listPublicEmployerFieldsFromDb(await getHrmsDb(), employerId, filters);
}
