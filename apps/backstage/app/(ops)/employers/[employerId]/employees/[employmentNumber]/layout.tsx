import { Suspense } from "react";
import { EmployeeShellSlot } from "@/shared/employee/shell-slot";
import { parsePositiveInt } from "@/shared/routing";

export default async function Employee360Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  const employer = parsePositiveInt(employerId);
  const decoded = decodeURIComponent(employmentNumber);

  return (
    <>
      <Suspense fallback={null}>
        <EmployeeShellSlot employerId={employer} employmentNumber={decoded} />
      </Suspense>
      {children}
    </>
  );
}
