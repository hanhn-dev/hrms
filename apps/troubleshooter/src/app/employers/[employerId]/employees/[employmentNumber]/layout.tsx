import { getEmployeeShellLabel } from "@/shared/employee";
import { parsePositiveInt } from "@/shared/routing";
import { EmployeeHeaderLabel } from "@/shared/ui";

export default async function Employee360Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  const label = await getEmployeeShellLabel(
    parsePositiveInt(employerId),
    decodeURIComponent(employmentNumber),
  );

  return (
    <>
      {label ? <EmployeeHeaderLabel label={label} /> : null}
      {children}
    </>
  );
}
