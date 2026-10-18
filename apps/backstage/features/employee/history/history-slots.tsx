import { captureQueryScript, missingObjectName } from "@hrms/db";
import { Alert, Card } from "antd";
import type { HistoryViewType } from "@hrms/db";
import { HistoryPanel } from "@/features/employee/history/history-panel";
import { getEmployeeHistoryChanges } from "@/features/employee/history/queries";
import { MissingObjectAlert } from "@/shared/ui";

export async function EmployeeHistorySlot({
  employerId,
  employmentNumber,
  type,
  section,
  from,
  to,
  pageNumber,
  pageSize,
}: {
  employerId: number;
  employmentNumber: string;
  type: HistoryViewType;
  section: string | null;
  from: string | null;
  to: string | null;
  pageNumber: number;
  pageSize: number;
}): Promise<React.JSX.Element> {
  let result: Awaited<ReturnType<typeof getEmployeeHistoryChanges>> = null;
  let queryScript = "";
  let missingObject: string | null = null;
  try {
    const loaded = await captureQueryScript(() =>
      getEmployeeHistoryChanges(employerId, employmentNumber, {
        type,
        section,
        from,
        to,
        pageNumber,
        pageSize,
      }),
    );
    result = loaded.result;
    queryScript = loaded.script;
  } catch (error) {
    missingObject = missingObjectName(error);
    if (!missingObject) {
      throw error;
    }
  }

  if (missingObject) {
    return (
      <MissingObjectAlert items={[{ feature: "History", objectName: missingObject }]} />
    );
  }
  if (!result) {
    return <Alert showIcon type="error" title="Employee was not found." />;
  }
  return (
    <Card title="History changes">
      <HistoryPanel
        type={type}
        section={section}
        from={from}
        to={to}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={result.totalItems}
        events={result.data}
        queryScript={queryScript}
      />
    </Card>
  );
}
