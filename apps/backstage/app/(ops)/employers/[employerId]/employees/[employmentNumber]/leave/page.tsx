import { EmployeeLeaveScreen } from "@/features/employee/leave";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeLeavePage({
  params,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  return (
    <EmployeeLeaveScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
    />
  );
}
