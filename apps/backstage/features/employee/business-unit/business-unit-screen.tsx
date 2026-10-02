import { captureQueryScript } from "@hrms/db";
import { Alert, Card } from "antd";
import { BusinessUnitSearchForm } from "@/features/employee/business-unit/business-unit-form";
import { BusinessUnitTable } from "@/features/employee/business-unit/business-unit-table";
import { listBusinessUnitEmployees } from "@/features/employee/business-unit/queries";
import { Employee360Nav, PageHelp } from "@/shared/ui";

export async function EmployeeBusinessUnitScreen({
  employerId,
  employmentNumber,
  search,
}: {
  employerId: number;
  employmentNumber: string;
  search: string;
}): Promise<React.JSX.Element> {
  const loaded = await captureQueryScript(() =>
    listBusinessUnitEmployees(employerId, employmentNumber, search),
  );
  const result = loaded.result;

  return (
    <>
      <PageHelp
        source="business-unit"
        notes={[
          {
            id: "scope",
            type: "info",
            title: "Search is scoped to this employee's business unit",
            description:
              "The list matches TEmployeeInfo.BusinessUnitId on the viewed employee, not the whole employer.",
          },
        ]}
      />
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      {!result ? (
        <Alert showIcon type="error" title="Employee was not found." />
      ) : result.businessUnitId == null ? (
        <Alert
          showIcon
          type="info"
          title="This employee has no business unit assigned."
        />
      ) : (
        <Card title={result.businessUnitName ?? "Business unit"}>
          <BusinessUnitSearchForm
            employerId={employerId}
            employmentNumber={employmentNumber}
            initialSearch={search}
          />
          <BusinessUnitTable
            currentEmployeeId={result.currentEmployeeId}
            employerId={employerId}
            queryScript={loaded.script}
            results={result.employees}
            search={search}
          />
        </Card>
      )}
    </>
  );
}
