import { missingObjectName } from "@hrms/db";
import { Card } from "antd";
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
  try {
    const found = await searchEmployees(employerId, search);
    results = found.hits;
    unavailable = found.unavailable;
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
        {blockedObject ? null : (
          <EmployeeSearchTable
            employerId={employerId}
            results={results}
            search={search}
            unavailableFields={unavailable.map((item) => item.field)}
          />
        )}
      </Card>
    </>
  );
}
