import { Card } from "antd";
import { EmployeeSearchForm } from "@/features/employee/search/search-form";
import { EmployeeSearchTable } from "@/features/employee/search/search-table";
import { searchEmployees } from "@/features/employee/search/queries";
import { PageHelp } from "@/shared/ui";

export async function EmployeeSearchScreen({
  employerId,
  search,
}: {
  employerId: number;
  search: string;
}): Promise<React.JSX.Element> {
  const results = await searchEmployees(employerId, search);

  return (
    <>
      <PageHelp
        source="employee-search"
        notes={[
          {
            id: "section-counts",
            type: "info",
            title: "Section count columns",
            description:
              "Skills, Domains, and other section columns are live active My Details row counts (same soft-delete rules as the Sections tab). Use each column’s filter for 0 / ≥ 1 / ≥ 2 / ≥ 5, and sort by clicking the header.",
          },
        ]}
      />
      <Card>
        <EmployeeSearchForm employerId={employerId} initialSearch={search} />
        <EmployeeSearchTable
          employerId={employerId}
          results={results}
          search={search}
        />
      </Card>
    </>
  );
}
