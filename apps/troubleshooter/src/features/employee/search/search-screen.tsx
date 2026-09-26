import { Card } from "antd";
import { EmployeeSearchForm } from "@/features/employee/search/search-form";
import { EmployeeSearchTable } from "@/features/employee/search/search-table";
import { searchEmployees } from "@/features/employee/search/queries";

export async function EmployeeSearchScreen({
  employerId,
  search,
}: {
  employerId: number;
  search: string;
}): Promise<React.JSX.Element> {
  const results = await searchEmployees(employerId, search);

  return (
    <Card>
      <EmployeeSearchForm employerId={employerId} initialSearch={search} />
      <EmployeeSearchTable
        employerId={employerId}
        results={results}
        search={search}
      />
    </Card>
  );
}
