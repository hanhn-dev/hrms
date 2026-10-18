import { Suspense } from "react";
import { EmployeeSectionsSlot } from "@/features/employee/sections/sections-slots";
import { Employee360Nav, PageHelp, SectionFallback } from "@/shared/ui";

export function EmployeeSectionsScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
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
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="Section summary" />}>
        <EmployeeSectionsSlot employerId={employerId} employmentNumber={employmentNumber} />
      </Suspense>
    </>
  );
}
