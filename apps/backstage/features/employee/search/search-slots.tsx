import { captureQueryScript, missingObjectName } from "@hrms/db";
import { EmployeeSearchTable } from "@/features/employee/search/search-table";
import { searchEmployees } from "@/features/employee/search/queries";
import { MissingObjectAlert } from "@/shared/ui";

export async function EmployeeSearchResultsSlot({
  employerId,
  page,
  pageSize,
  search,
}: {
  employerId: number;
  page: number;
  pageSize: number;
  search: string;
}): Promise<React.JSX.Element> {
  let results: Awaited<ReturnType<typeof searchEmployees>>["hits"] = [];
  let unavailable: Awaited<ReturnType<typeof searchEmployees>>["unavailable"] = [];
  let blockedObject: string | null = null;
  let queryScript = "";
  let resultPage = page;
  let resolvedPageSize = pageSize;
  let total = 0;
  try {
    const found = await captureQueryScript(() =>
      searchEmployees(employerId, search, page, pageSize),
    );
    results = found.result.hits;
    unavailable = found.result.unavailable;
    queryScript = found.script;
    resultPage = found.result.page;
    resolvedPageSize = found.result.pageSize;
    total = found.result.totalCount;
  } catch (error) {
    blockedObject = missingObjectName(error);
    if (!blockedObject) {
      throw error;
    }
  }

  return (
    <>
      {blockedObject ? (
        <MissingObjectAlert
          items={[{ feature: "Employee search", objectName: blockedObject }]}
        />
      ) : (
        <MissingObjectAlert items={unavailable} />
      )}
      {blockedObject ? null : (
        <EmployeeSearchTable
          employerId={employerId}
          page={resultPage}
          pageSize={resolvedPageSize}
          queryScript={queryScript}
          results={results}
          search={search}
          total={total}
          unavailableFields={unavailable.map((item) => item.field)}
        />
      )}
    </>
  );
}
