import { Card } from "antd";
import { SectionsPanel } from "@/features/employee/sections/sections-panel";
import { getEmployeeSectionCounts } from "@/features/employee/sections/queries";
import { Employee360Nav, PageHelp } from "@/shared/ui";

export async function EmployeeSectionsScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const rows = await getEmployeeSectionCounts(employerId, employmentNumber);

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
              "Counts are current section rows for this employee, using the same soft-delete and Show filters as My Details Get loaders. Soft-deleted rows and hidden bank accounts are excluded. This is not history change-event volume.",
          },
          {
            id: "passport-visa",
            type: "info",
            title: "Passport & Visa are combined",
            description:
              "Passport & Visa Details is the sum of active passport rows plus active visa rows, matching the History section grouping.",
          },
        ]}
      />
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      <Card title="Section summary">
        <SectionsPanel rows={rows} />
      </Card>
    </>
  );
}
