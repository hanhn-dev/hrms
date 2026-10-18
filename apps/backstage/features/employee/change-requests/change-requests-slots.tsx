import { captureQueryScript } from "@hrms/db";
import { Alert } from "antd";
import { ChangeRequestsPanel } from "@/features/employee/change-requests/change-requests-panel";
import { listEmployeeChangeRequests } from "@/features/employee/change-requests/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function EmployeeChangeRequestsSlot({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const [writesEnabled, loaded] = await Promise.all([
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
    captureQueryScript(() => listEmployeeChangeRequests(employerId, employmentNumber)),
  ]);
  if (loaded.result == null) {
    return <Alert showIcon type="error" title="Employee was not found." />;
  }
  return (
    <ChangeRequestsPanel
      employerId={employerId}
      queryScript={loaded.script}
      requests={loaded.result}
      writesEnabled={writesEnabled}
    />
  );
}
