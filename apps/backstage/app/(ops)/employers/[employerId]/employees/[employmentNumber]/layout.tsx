import { RememberRecentEmployee } from "@/features/employee/recent";
import { getEmployeeShell } from "@/shared/employee";
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
  const employer = parsePositiveInt(employerId);
  const shell = await getEmployeeShell(
    employer,
    decodeURIComponent(employmentNumber),
  );

  return (
    <>
      {shell ? (
        <>
          <EmployeeHeaderLabel
            label={`${shell.fullName} · ${shell.employmentNumber}`}
          />
          <RememberRecentEmployee
            employerId={employer}
            employmentNumber={shell.employmentNumber}
            fullName={shell.fullName}
          />
        </>
      ) : null}
      {children}
    </>
  );
}
