import {
  getEmployeeSectionCounts as getEmployeeSectionCountsFromDb,
  isCrudSectionId,
  listSectionRecords,
  sectionRecordSpecForId,
  sectionTableSupportsDelete,
  type EmployeeSectionCount,
  type SectionFormField,
  type SectionRecordRow,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type { EmployeeSectionCount, SectionFormField, SectionRecordRow };

export async function getEmployeeSectionCounts(
  employerId: number,
  employmentNumber: string,
): Promise<EmployeeSectionCount[]> {
  await requireRootAdmin();
  return getEmployeeSectionCountsFromDb(
    await getHrmsDb(),
    employerId,
    employmentNumber,
  );
}

export async function getSectionRecordsPage(input: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
}): Promise<{
  fields: SectionFormField[];
  records: SectionRecordRow[];
  label: string;
  sectionName: string;
  crudSupported: boolean;
}> {
  await requireRootAdmin();
  if (!isCrudSectionId(input.sectionId)) {
    const spec = sectionRecordSpecForId(input.sectionId);
    return {
      fields: [],
      records: [],
      label: spec?.label ?? `Section ${input.sectionId}`,
      sectionName: spec?.sectionName ?? `Section ${input.sectionId}`,
      crudSupported: false,
    };
  }
  const data = await listSectionRecords(await getHrmsDb(), input);
  return { ...data, crudSupported: true };
}

export function canDeleteRecord(
  sectionId: number,
  liveTable: string,
): boolean {
  return sectionTableSupportsDelete(sectionId, liveTable);
}
