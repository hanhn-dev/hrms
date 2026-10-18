import { Suspense } from "react";
import { EmployeeApproversSlot } from "@/features/employee/approvers/approvers-slots";
import { Employee360Nav, PageHelp, SectionFallback } from "@/shared/ui";

export function EmployeeApproversScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="approvers"
        notes={[
          {
            id: "match",
            type: "info",
            title: "Who can approve requests this employee raises",
            description:
              "Each page uses the workflow that covers this employee's location and business unit. A custom workflow with no location or business unit is used when nothing more specific matches. A default workflow is used only when the page has no custom workflow.",
          },
          {
            id: "groups",
            type: "info",
            title: "Workflow groups",
            description:
              "A group member can approve only when the group is mapped to both this employee's location and business unit. Hiring manager, recruiter, and previous-level roles stay unresolved until a specific request exists.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="Approvers" />}>
        <EmployeeApproversSlot employerId={employerId} employmentNumber={employmentNumber} />
      </Suspense>
    </>
  );
}
