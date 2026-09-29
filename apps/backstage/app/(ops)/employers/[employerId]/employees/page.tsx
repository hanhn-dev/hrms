import { EmployeeSearchScreen } from "@/features/employee/search";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ q?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <EmployeeSearchScreen
      employerId={parsePositiveInt(employerId)}
      search={query.q ?? ""}
    />
  );
}
