import { EmployeeSectionsScreen } from "@/features/employee/sections";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeSectionsPage({
  params,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, employmentNumber } = await params;
  return (
    <EmployeeSectionsScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
    />
  );
}
