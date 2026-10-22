import { Suspense } from "react";
import { EmployeeAccessSlot } from "@/features/employee/access/access-slots";
import { Employee360Nav, PageHelp, SectionFallback } from "@/shared/ui";

export function EmployeeAccessScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="employee-access"
        notes={[
          {
            id: "location-bu-diagnostic",
            type: "info",
            title: "Effective Location / BU scope",
            description:
              "Shows user and role LocationIds / BusinessUnitIds and the merged lists FN_LocationBU_GetEmployeeDetails_Clone uses. Empty lists are unrestricted. If this employee is out of scope, country and employee list SPs can return empty — edit the role on Roles.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="Access" />}>
        <EmployeeAccessSlot employerId={employerId} employmentNumber={employmentNumber} />
      </Suspense>
    </>
  );
}
