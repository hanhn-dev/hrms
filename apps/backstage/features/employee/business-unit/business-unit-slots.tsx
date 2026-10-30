import { captureQueryScript } from "@hrms/db";
import { Alert, Card } from "antd";
import { BusinessUnitTable } from "@/features/employee/business-unit/business-unit-table";
import { listBusinessUnitEmployees } from "@/features/employee/business-unit/queries";

export async function EmployeeBusinessUnitSlot({
  employerId,
  employmentNumber,
  page,
  pageSize,
  search,
}: {
  employerId: number;
  employmentNumber: string;
  page: number;
  pageSize: number;
  search: string;
}): Promise<React.JSX.Element | null> {
  const loaded = await captureQueryScript(() =>
    listBusinessUnitEmployees(employerId, employmentNumber, search, page, pageSize),
  );
  const result = loaded.result;
  if (!result) {
    return <Alert showIcon type="error" title="Employee was not found." />;
  }
  if (result.businessUnitId == null) {
    return (
      <Alert showIcon type="info" title="This employee has no business unit assigned." />
    );
  }
  return (
    <Card title={result.businessUnitName ?? "Business unit"}>
      <BusinessUnitTable
        currentEmployeeId={result.currentEmployeeId}
        employerId={employerId}
        employmentNumber={employmentNumber}
        page={result.page}
        pageSize={result.pageSize}
        queryScript={loaded.script}
        results={result.employees}
        search={search}
        total={result.totalCount}
      />
    </Card>
  );
}
