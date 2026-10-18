import { Suspense } from "react";
import { EmployeeLoginSlot } from "@/features/employee/login/login-slots";
import { Employee360Nav, SectionFallback } from "@/shared/ui";

export function EmployeeLoginScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
  return (
    <>
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      <Suspense fallback={<SectionFallback title="Account" />}>
        <EmployeeLoginSlot employerId={employerId} employmentNumber={employmentNumber} />
      </Suspense>
    </>
  );
}
