import { Suspense } from "react";
import { EmployeeAccessSlot } from "@/features/employee/access/access-slots";
import { Employee360Nav, SectionFallback } from "@/shared/ui";

export function EmployeeAccessScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
  return (
    <>
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="Access" />}>
        <EmployeeAccessSlot employerId={employerId} employmentNumber={employmentNumber} />
      </Suspense>
    </>
  );
}
