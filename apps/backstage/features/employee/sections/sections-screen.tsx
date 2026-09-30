import { Card } from "antd";
import { SectionsPanel } from "@/features/employee/sections/sections-panel";
import { getEmployeeSectionCounts } from "@/features/employee/sections/queries";
import { Employee360Nav, MissingObjectAlert, PageHelp } from "@/shared/ui";

export async function EmployeeSectionsScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const rows = await getEmployeeSectionCounts(employerId, employmentNumber);
  const unavailable = rows.flatMap((row) =>
    row.missingObjects.map((objectName) => ({
      feature: row.label,
      objectName,
    })),
  );

  return (
    <>
      <PageHelp
        source="employee-sections"
        notes={[
          {
            id: "live-counts",
            type: "info",
            title: "Live active My Details rows",
            description:
              "Counts are current section rows for this employee, using the same soft-delete and Show filters as Troubleshooter count SQL (not HRMS Get SPs). Soft-deleted rows and hidden bank accounts are excluded. This is not history change-event volume.",
          },
          {
            id: "passport-visa",
            type: "info",
            title: "Passport & Visa are combined",
            description:
              "Passport & Visa Details is the sum of active passport rows plus active visa rows, matching the History section grouping.",
          },
          {
            id: "crud",
            type: "info",
            title: "Multi-record CRUD",
            description:
              "Click a multi-record section to list, add, update, or soft-delete rows. Forms are built from employer field catalog (Segment excluded). Personal and Employment Details stay count-only in v1. Writes use custom @hrms/db SQL under the Troubleshooter write gate.",
          },
        ]}
      />
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      <MissingObjectAlert items={unavailable} />
      <Card title="Section summary">
        <SectionsPanel
          employerId={employerId}
          employmentNumber={employmentNumber}
          rows={rows}
        />
      </Card>
    </>
  );
}
