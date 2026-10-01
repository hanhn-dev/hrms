import { EmployeeApproversScreen } from "@/features/employee/approvers";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeApproversPage({
  params,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  return (
    <EmployeeApproversScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
    />
  );
}
