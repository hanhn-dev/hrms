import { captureQueryScript, missingObjectName } from "@hrms/db";
import { EmployeeSearchTable } from "@/features/employee/search/search-table";
import { searchEmployees } from "@/features/employee/search/queries";
import { MissingObjectAlert } from "@/shared/ui";

export async function EmployeeSearchResultsSlot({
  employerId,
  search,
}: {
  employerId: number;
  search: string;
}): Promise<React.JSX.Element> {
  let results: Awaited<ReturnType<typeof searchEmployees>>["hits"] = [];
  let unavailable: Awaited<ReturnType<typeof searchEmployees>>["unavailable"] = [];
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
          queryScript={queryScript}
          results={results}
          search={search}
          unavailableFields={unavailable.map((item) => item.field)}
        />
      )}
    </>
  );
}
