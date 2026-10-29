import { captureQueryScript } from "@hrms/db";
import { Alert } from "antd";
import { ChangeRequestsPanel } from "@/features/employee/change-requests/change-requests-panel";
import { listEmployeeChangeRequests } from "@/features/employee/change-requests/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function EmployeeChangeRequestsSlot({
  employerId,
  employmentNumber,
  page,
  search,
  status,
}: {
  employerId: number;
  employmentNumber: string;
  page: number;
  search: string;
  status: "pending" | "approved" | "rejected" | "all";
}): Promise<React.JSX.Element> {
  const [writesEnabled, loaded] = await Promise.all([
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
    captureQueryScript(() =>
      listEmployeeChangeRequests(employerId, employmentNumber, { page, q: search, status }),
    ),
  ]);
  if (loaded.result == null) {
    return <Alert showIcon type="error" title="Employee was not found." />;
  }
  return (
    <ChangeRequestsPanel
      employerId={employerId}
      employmentNumber={employmentNumber}
      page={loaded.result.page}
      pageSize={loaded.result.pageSize}
      queryScript={loaded.script}
      requests={loaded.result.rows}
      search={search}
      status={status}
      total={loaded.result.totalCount}
      writesEnabled={writesEnabled}
    />
  );
}
