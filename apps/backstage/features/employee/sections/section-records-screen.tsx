import { Suspense } from "react";
import { Alert } from "antd";
import { isCrudSectionId, sectionRecordSpecForId } from "@hrms/db";
import { SectionRecordsSlot } from "@/features/employee/sections/section-records-slots";
import { Employee360Nav, PageHelp, SectionFallback } from "@/shared/ui";

export function SectionRecordsScreen({
  employerId,
  employmentNumber,
  sectionId,
}: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
}): React.JSX.Element {
  const crud = isCrudSectionId(sectionId);
  const spec = sectionRecordSpecForId(sectionId);
  const label = spec?.label ?? `Section ${sectionId}`;

  return (
    <>
      <PageHelp
        source="employee-section-records"
        notes={[
          {
            id: "own-sql",
            type: "info",
            title: "Troubleshooter-owned SQL",
            description:
              "Reads and writes use custom parameterized queries in @hrms/db against base tables only. They do not call HRMS stored procedures, views, or functions, and do not insert My Details history rows.",
          },
          {
            id: "segment",
            type: "info",
            title: "Segment fields excluded",
            description:
              "Form fields exclude FieldEntity = Segment. Validation uses each field's ValidationRule (pure and cross-field rules inline; limited exist/unique checks on commit).",
          },
          {
            id: "soft-delete",
            type: "warning",
            title: "Soft-delete only",
            description:
              "Delete soft-marks rows when a delete column exists (matching live count filters). Passport and Contact deletes are not supported when no soft-delete column is configured.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      {!crud ? (
        <Alert
          type="info"
          showIcon
          title="Record CRUD is not available for this section"
          description="Personal Details and Current Employment Details are deferred. Use the Sections summary for counts only."
        />
      ) : (
        <Suspense fallback={<SectionFallback title={`${label} records`} />}>
          <SectionRecordsSlot
            employerId={employerId}
            employmentNumber={employmentNumber}
            label={label}
            sectionId={sectionId}
          />
        </Suspense>
      )}
    </>
  );
}
