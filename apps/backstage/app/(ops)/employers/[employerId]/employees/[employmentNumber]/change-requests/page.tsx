import { EmployeeChangeRequestsScreen } from "@/features/employee/change-requests";
import { readListPage, readListSearch } from "@/shared/list-query";
import { parsePositiveInt } from "@/shared/routing";

function requestStatus(
  value: string | undefined,
): "pending" | "approved" | "rejected" | "all" {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return "all";
}

export default async function EmployeeChangeRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId, employmentNumber }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <EmployeeChangeRequestsScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
      page={readListPage(query.page)}
      search={readListSearch(query.q) ?? ""}
      status={requestStatus(query.status)}
    />
  );
}
