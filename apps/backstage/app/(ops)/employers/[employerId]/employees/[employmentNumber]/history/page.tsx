import { EmployeeHistoryScreen } from "@/features/employee/history";
import { parsePositiveInt } from "@/shared/routing";

export default async function EmployeeHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string; employmentNumber: string }>;
  searchParams: Promise<{
    type?: string;
    section?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}): Promise<React.JSX.Element> {
  const [{ employerId, employmentNumber }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <EmployeeHistoryScreen
      employerId={parsePositiveInt(employerId)}
      employmentNumber={decodeURIComponent(employmentNumber)}
      type={query.type}
      section={query.section}
      from={query.from}
      to={query.to}
      page={query.page}
    />
  );
}
