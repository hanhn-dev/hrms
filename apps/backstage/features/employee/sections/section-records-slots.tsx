import { Suspense } from "react";
import { missingObjectName, sectionRecordSpecForId } from "@hrms/db";
import { SectionPendingCard } from "@/features/employee/sections/section-pending-card";
import { SectionRecordsPanel } from "@/features/employee/sections/section-records-panel";
import {
  loadPendingSectionRecords,
  loadSectionRecords,
  type SectionFormField,
  type SectionRecordRow,
  type SectionRecordsLoad,
} from "@/features/employee/sections/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { MissingObjectAlert, SectionFallback } from "@/shared/ui";

export async function SectionRecordsSlot({
  employerId,
  employmentNumber,
  sectionId,
  label,
}: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  label: string;
}): Promise<React.JSX.Element> {
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());
  const spec = sectionRecordSpecForId(sectionId);
  let page: SectionRecordsLoad | undefined;
  let missingObject: string | undefined;
  try {
    page = await loadSectionRecords({
      employerId,
      employmentNumber,
      sectionId,
    });
  } catch (error) {
    const name = missingObjectName(error);
    if (!name) {
      throw error;
    }
    missingObject = name;
  }

  if (missingObject) {
    return (
      <MissingObjectAlert items={[{ feature: label, objectName: missingObject }]} />
    );
  }
  if (page == null) {
    throw new Error("Section records did not load.");
  }

  const tables = Array.from(
    new Set(
      (spec?.tables.map((table) => table.liveTable) ?? []).concat(
        page.fields
          .map((field) => field.dbTable)
          .filter((table): table is string => table != null && table.trim() !== ""),
      ),
    ),
  );
  return (
    <>
      <SectionRecordsPanel
        employerId={employerId}
        employmentNumber={employmentNumber}
        fields={page.fields}
        label={page.label}
        records={page.records}
        recordsScript={page.recordsScript}
        sectionId={sectionId}
        tables={tables.length > 0 ? tables : [spec!.tables[0]!.liveTable]}
        writesEnabled={writesEnabled}
      />
      <Suspense fallback={<SectionFallback title="Pending approval" />}>
        <SectionPendingSlot
          employerId={employerId}
          employmentNumber={employmentNumber}
          fields={page.fields}
          liveRecords={page.records}
          sectionId={sectionId}
          writesEnabled={writesEnabled}
        />
      </Suspense>
    </>
  );
}

async function SectionPendingSlot({
  employerId,
  employmentNumber,
  sectionId,
  fields,
  liveRecords,
  writesEnabled,
}: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  fields: SectionFormField[];
  liveRecords: SectionRecordRow[];
  writesEnabled: boolean;
}): Promise<React.JSX.Element> {
  let pendingRows: Awaited<ReturnType<typeof loadPendingSectionRecords>> | undefined;
  let missingObject: string | undefined;
  try {
    pendingRows = await loadPendingSectionRecords({
      employerId,
      employmentNumber,
      sectionId,
      fields,
      liveRecords,
    });
  } catch (error) {
    const name = missingObjectName(error);
    if (!name) {
      throw error;
    }
    missingObject = name;
  }

  if (missingObject) {
    return (
      <MissingObjectAlert items={[{ feature: "Pending approval", objectName: missingObject }]} />
    );
  }
  if (pendingRows == null) {
    throw new Error("Pending section records did not load.");
  }

  return (
    <SectionPendingCard
      employerId={employerId}
      fields={fields}
      pending={pendingRows.pending}
      pendingScript={pendingRows.pendingScript}
      writesEnabled={writesEnabled}
    />
  );
}
