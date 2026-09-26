import { EmployeeProfileScreen } from "@/features/employee/profile";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  return (
    <EmployeeProfileScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
    />
  );
}
