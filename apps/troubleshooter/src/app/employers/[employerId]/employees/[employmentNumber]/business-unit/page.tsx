import { EmployeeBusinessUnitScreen } from "@/features/employee/business-unit";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeBusinessUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
  searchParams: Promise<{ q?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId, employmentNumber }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <EmployeeBusinessUnitScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
      search={query.q ?? ""}
    />
  );
}
