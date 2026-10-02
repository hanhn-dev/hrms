import { EmployeeChangeRequestsScreen } from "@/features/employee/change-requests";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeChangeRequestsPage({
  params,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  return (
    <EmployeeChangeRequestsScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
    />
  );
}
