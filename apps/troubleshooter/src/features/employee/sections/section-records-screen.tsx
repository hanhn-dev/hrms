import { Alert, Card } from "antd";
import { isCrudSectionId, sectionRecordSpecForId } from "@hrms/db";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { Employee360Nav, PageHelp } from "@/shared/ui";
import { getSectionRecordsPage } from "@/features/employee/sections/queries";
import { SectionRecordsPanel } from "@/features/employee/sections/section-records-panel";

export async function SectionRecordsScreen({
  employerId,
  employmentNumber,
  sectionId,
}: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
}): Promise<React.JSX.Element> {
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());
  const crud = isCrudSectionId(sectionId);
  const spec = sectionRecordSpecForId(sectionId);
  const page = crud
    ? await getSectionRecordsPage({
        employerId,
        employmentNumber,
        sectionId,
      })
    : {
        fields: [],
        records: [],
        label: spec?.label ?? `Section ${sectionId}`,
        sectionName: spec?.sectionName ?? `Section ${sectionId}`,
        crudSupported: false,
      };

  const tables = Array.from(
    new Set(
      (spec?.tables.map((t) => t.liveTable) ?? []).concat(
        page.fields
          .map((f) => f.dbTable)
          .filter((t): t is string => t != null && t.trim() !== ""),
      ),
    ),
  );

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
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      {!crud ? (
        <Alert
          type="info"
          showIcon
          title="Record CRUD is not available for this section"
          description="Personal Details and Current Employment Details are deferred. Use the Sections summary for counts only."
        />
      ) : (
        <Card title={`${page.label} records`}>
          <SectionRecordsPanel
            employerId={employerId}
            employmentNumber={employmentNumber}
            sectionId={sectionId}
            label={page.label}
            fields={page.fields}
            records={page.records}
            writesEnabled={writesEnabled}
            tables={tables.length > 0 ? tables : [spec!.tables[0]!.liveTable]}
          />
        </Card>
      )}
    </>
  );
}
