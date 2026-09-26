import { EmployeeLoginScreen } from "@/features/employee/login";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeLoginPage({
  params,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  return (
    <EmployeeLoginScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
    />
  );
}
