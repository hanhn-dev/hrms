import { EmployeeSearchScreen } from "@/features/employee/search";
import { readListPage, readListPageSize } from "@/shared/list-query";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <EmployeeSearchScreen
      employerId={parsePositiveInt(employerId)}
      page={readListPage(query.page)}
      pageSize={readListPageSize(query.pageSize)}
      search={query.q ?? ""}
    />
  );
}
