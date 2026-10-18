import { Suspense } from "react";
import { Card } from "antd";
import { RecentEmployeeStrip } from "@/features/employee/recent";
import { EmployeeSearchForm } from "@/features/employee/search/search-form";
import { EmployeeSearchResultsSlot } from "@/features/employee/search/search-slots";
import { PageHelp, SectionFallback } from "@/shared/ui";

export function EmployeeSearchScreen({
  employerId,
  search,
}: {
  employerId: number;
  search: string;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="employee-search"
        notes={[
          {
            id: "employee-status",
            type: "info",
            title: "Employee status",
            description:
              "Active-Resigned means the employee is still active and has submitted a separation. The rule matches employee summary: the latest resignation or pullback workflow (Pending, Approved, or Pullback) still points at the employee. A completed pullback stays Active.",
          },
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
        <RecentEmployeeStrip employerId={employerId} />
        <Suspense fallback={<SectionFallback title="Employees" />}>
          <EmployeeSearchResultsSlot employerId={employerId} search={search} />
        </Suspense>
      </Card>
    </>
  );
}
