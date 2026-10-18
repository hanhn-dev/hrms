import { captureQueryScript } from "@hrms/db";
import { Alert } from "antd";
import { ApproversTable } from "@/features/employee/approvers/approvers-table";
import { listEmployeeApprovers } from "@/features/employee/approvers/queries";

export async function EmployeeApproversSlot({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const loaded = await captureQueryScript(() =>
    listEmployeeApprovers(employerId, employmentNumber),
  );
  if (!loaded.result) {
    return <Alert showIcon type="error" title="Employee was not found." />;
  }
  return (
    <ApproversTable
      employerId={employerId}
      queryScript={loaded.script}
      result={loaded.result}
    />
  );
}
