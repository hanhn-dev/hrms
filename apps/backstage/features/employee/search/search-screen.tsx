import { captureQueryScript, missingObjectName } from "@hrms/db";
import { Card } from "antd";
import { RecentEmployeeStrip } from "@/features/employee/recent";
import { EmployeeSearchForm } from "@/features/employee/search/search-form";
import { EmployeeSearchTable } from "@/features/employee/search/search-table";
import {
  searchEmployees,
  type EmployeeSearchHit,
  type EmployeeSearchResult,
} from "@/features/employee/search/queries";
import { MissingObjectAlert, PageHelp } from "@/shared/ui";

export async function EmployeeSearchScreen({
  employerId,
  search,
}: {
  employerId: number;
  search: string;
}): Promise<React.JSX.Element> {
  let results: EmployeeSearchHit[] = [];
  let unavailable: EmployeeSearchResult["unavailable"] = [];
  let blockedObject: string | null = null;
  let queryScript = "";
  try {
    const found = await captureQueryScript(() =>
      searchEmployees(employerId, search),
    );
    results = found.result.hits;
    unavailable = found.result.unavailable;
    queryScript = found.script;
  } catch (error) {
    blockedObject = missingObjectName(error);
    if (!blockedObject) {
      throw error;
    }
  }

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
      {blockedObject ? (
        <MissingObjectAlert
          items={[{ feature: "Employee search", objectName: blockedObject }]}
        />
      ) : (
        <MissingObjectAlert items={unavailable} />
      )}
      <Card>
        <EmployeeSearchForm employerId={employerId} initialSearch={search} />
        <RecentEmployeeStrip employerId={employerId} />
        {blockedObject ? null : (
          <EmployeeSearchTable
            employerId={employerId}
            queryScript={queryScript}
            results={results}
            search={search}
            unavailableFields={unavailable.map((item) => item.field)}
          />
        )}
      </Card>
    </>
  );
}
