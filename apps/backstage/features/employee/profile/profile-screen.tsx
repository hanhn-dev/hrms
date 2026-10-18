import { Suspense } from "react";
import { EmployeeProfileSlot } from "@/features/employee/profile/profile-slots";
import { Employee360Nav, SectionFallback } from "@/shared/ui";

export function EmployeeProfileScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
  return (
    <>
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="Profile" />}>
        <EmployeeProfileSlot employerId={employerId} employmentNumber={employmentNumber} />
      </Suspense>
    </>
  );
}
