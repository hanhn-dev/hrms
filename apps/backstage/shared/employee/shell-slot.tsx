import { RememberRecentEmployee } from "@/features/employee/recent";
import { getEmployeeShell } from "@/shared/employee/resolve";
import { EmployeeHeaderLabel } from "@/shared/ui";

export async function EmployeeShellSlot({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element | null> {
  const shell = await getEmployeeShell(employerId, employmentNumber);
  if (!shell) {
    return null;
  }
  return (
    <>
      <EmployeeHeaderLabel label={`${shell.fullName} · ${shell.employmentNumber}`} />
      <RememberRecentEmployee
        employerId={employerId}
        employmentNumber={shell.employmentNumber}
        fullName={shell.fullName}
      />
    </>
  );
}
