import { captureQueryScript } from "@hrms/db";
import { Alert, Card } from "antd";
import { BusinessUnitTable } from "@/features/employee/business-unit/business-unit-table";
import { listBusinessUnitEmployees } from "@/features/employee/business-unit/queries";

export async function EmployeeBusinessUnitSlot({
  employerId,
  employmentNumber,
  search,
}: {
  employerId: number;
  employmentNumber: string;
  search: string;
}): Promise<React.JSX.Element | null> {
  const loaded = await captureQueryScript(() =>
    listBusinessUnitEmployees(employerId, employmentNumber, search),
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
        queryScript={loaded.script}
        results={result.employees}
        search={search}
      />
    </Card>
  );
}
