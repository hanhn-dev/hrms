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
  type SectionLookupRef,
  type SectionRecordRow,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  EmployeeSectionCount,
  PendingSectionRow,
  SectionFormField,
  SectionLookupRef,
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

export type SectionRecordsLoad = {
  fields: SectionFormField[];
  records: SectionRecordRow[];
  label: string;
  sectionName: string;
  recordsScript: string;
};

export async function loadSectionRecords(input: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
}): Promise<SectionRecordsLoad> {
  await requireRootAdmin();
  const db = await getHrmsDb();
  const recordsLoaded = await captureQueryScript(() => listSectionRecords(db, input));
  return {
    ...recordsLoaded.result,
    recordsScript: recordsLoaded.script,
  };
}

export async function loadPendingSectionRecords(input: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  fields: SectionFormField[];
  liveRecords: SectionRecordRow[];
}): Promise<{ pending: PendingSectionRow[]; pendingScript: string }> {
  await requireRootAdmin();
  const db = await getHrmsDb();
  const pendingLoaded = await captureQueryScript(() =>
    listPendingSectionRecords(db, input),
  );
  return {
    pending: pendingLoaded.result,
    pendingScript: pendingLoaded.script,
  };
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
  const records = await loadSectionRecords(input);
  const pending = await loadPendingSectionRecords({
    ...input,
    fields: records.fields,
    liveRecords: records.records,
  });
  return {
    ...records,
    pending: pending.pending,
    crudSupported: true,
    pendingScript: pending.pendingScript,
  };
}

export function canDeleteRecord(sectionId: number, liveTable: string): boolean {
  return sectionTableSupportsDelete(sectionId, liveTable);
}
