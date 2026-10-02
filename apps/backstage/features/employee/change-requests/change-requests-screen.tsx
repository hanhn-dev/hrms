import { captureQueryScript } from "@hrms/db";
import { Alert } from "antd";
import { ChangeRequestsPanel } from "@/features/employee/change-requests/change-requests-panel";
import { listEmployeeChangeRequests } from "@/features/employee/change-requests/queries";
import { Employee360Nav, PageHelp } from "@/shared/ui";

export async function EmployeeChangeRequestsScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const loaded = await captureQueryScript(() =>
    listEmployeeChangeRequests(employerId, employmentNumber),
  );
  const requests = loaded.result;

  return (
    <>
      <PageHelp
        source="employee-change-requests"
        notes={[
          {
            id: "subject",
            type: "info",
            title: "Requests for this employee",
            description:
              "Each row is a My Details change request where this person is the subject. Requested by shows who submitted it, including changes filed on their behalf.",
          },
          {
            id: "groups",
            type: "info",
            title: "Grouped by workflow",
            description:
              "Requests are grouped by the workflow that owns them. A request with no workflow queue sits under No workflow. Groups that still have pending requests start open.",
          },
        ]}
      />
      <Employee360Nav employerId={employerId} employmentNumber={employmentNumber} />
      {requests == null ? (
        <Alert showIcon type="error" title="Employee was not found." />
      ) : (
        <ChangeRequestsPanel
          employerId={employerId}
          queryScript={loaded.script}
          requests={requests}
        />
      )}
    </>
  );
}
