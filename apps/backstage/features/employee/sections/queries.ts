import {
  captureQueryScript,
  getEmployeeSectionCounts as getEmployeeSectionCountsFromDb,
  isCrudSectionId,
  listPendingSectionRecords,
  listSectionRecords,
  sectionRecordSpecForId,
  sectionTableSupportsDelete,
  type EmployeeSectionCount,
  type PendingSectionRow,
  type SectionFormField,
  type SectionRecordRow,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  EmployeeSectionCount,
  PendingSectionRow,
  SectionFormField,
  SectionRecordRow,
};

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
  pending: PendingSectionRow[];
  label: string;
  sectionName: string;
  crudSupported: boolean;
  recordsScript: string;
  pendingScript: string;
}> {
  await requireRootAdmin();
  if (!isCrudSectionId(input.sectionId)) {
    const spec = sectionRecordSpecForId(input.sectionId);
    return {
      fields: [],
      records: [],
      pending: [],
      label: spec?.label ?? `Section ${input.sectionId}`,
      sectionName: spec?.sectionName ?? `Section ${input.sectionId}`,
      crudSupported: false,
      recordsScript: "",
      pendingScript: "",
    };
  }
  const db = await getHrmsDb();
  const recordsLoaded = await captureQueryScript(() => listSectionRecords(db, input));
  const data = recordsLoaded.result;
  const pendingLoaded = await captureQueryScript(() =>
    listPendingSectionRecords(db, {
      employerId: input.employerId,
      employmentNumber: input.employmentNumber,
      sectionId: input.sectionId,
      fields: data.fields,
      liveRecords: data.records,
    }),
  );
  return {
    ...data,
    pending: pendingLoaded.result,
    crudSupported: true,
    recordsScript: recordsLoaded.script,
    pendingScript: pendingLoaded.script,
  };
}

export function canDeleteRecord(sectionId: number, liveTable: string): boolean {
  return sectionTableSupportsDelete(sectionId, liveTable);
}
