import { EmployeeBusinessUnitScreen } from "@/features/employee/business-unit";
import { readListPage, readListPageSize } from "@/shared/list-query";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeBusinessUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId, employmentNumber }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <EmployeeBusinessUnitScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
      page={readListPage(query.page)}
      pageSize={readListPageSize(query.pageSize)}
      search={query.q ?? ""}
    />
  );
}
