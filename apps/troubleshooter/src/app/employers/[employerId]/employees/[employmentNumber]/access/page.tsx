import { EmployeeAccessScreen } from "@/features/employee/access";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeAccessPage({
  params,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  return (
    <EmployeeAccessScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
    />
  );
}
