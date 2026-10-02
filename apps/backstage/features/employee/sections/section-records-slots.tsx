import { Suspense } from "react";
import { missingObjectName, sectionRecordSpecForId } from "@hrms/db";
import { SectionPendingCard } from "@/features/employee/sections/section-pending-card";
import { SectionRecordsPanel } from "@/features/employee/sections/section-records-panel";
import {
  loadPendingSectionRecords,
  loadSectionRecords,
  type SectionFormField,
  type SectionRecordRow,
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
  try {
    const page = await loadSectionRecords({
      employerId,
      employmentNumber,
      sectionId,
    });
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
  } catch (error) {
    const missingObject = missingObjectName(error);
    if (!missingObject) {
      throw error;
    }
    return (
      <MissingObjectAlert items={[{ feature: label, objectName: missingObject }]} />
    );
  }
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
  try {
    const pending = await loadPendingSectionRecords({
      employerId,
      employmentNumber,
      sectionId,
      fields,
      liveRecords,
    });
    return (
      <SectionPendingCard
        employerId={employerId}
        fields={fields}
        pending={pending.pending}
        pendingScript={pending.pendingScript}
        writesEnabled={writesEnabled}
      />
    );
  } catch (error) {
    const missingObject = missingObjectName(error);
    if (!missingObject) {
      throw error;
    }
    return (
      <MissingObjectAlert items={[{ feature: "Pending approval", objectName: missingObject }]} />
    );
  }
}
