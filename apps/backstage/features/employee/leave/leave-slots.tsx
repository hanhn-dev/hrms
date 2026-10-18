import { captureQueryScript } from "@hrms/db";
import { Card } from "antd";
import { getEmployeeLeaveBalances } from "@/features/employee/leave/queries";
import { formatDate } from "@/shared/format-date";
import { DataTable } from "@/shared/ui";

export async function EmployeeLeaveSlot({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const loaded = await captureQueryScript(() =>
    getEmployeeLeaveBalances(employerId, employmentNumber),
  );

  return (
    <Card>
      <DataTable
        queryScript={loaded.script}
        rowKey="transId"
        dataSource={loaded.result.map((row) => ({
          ...row,
          lastUpdateDate: formatDate(row.lastUpdateDate),
        }))}
        size="small"
        scroll={{ x: "max-content" }}
        columns={[
          { title: "TransId", dataIndex: "transId", width: 100 },
          { title: "Code", dataIndex: "leaveType", width: 100 },
          { title: "Name", dataIndex: "leaveName" },
          { title: "Balance days", dataIndex: "balanceDays", width: 140 },
          { title: "Last updated", dataIndex: "lastUpdateDate" },
        ]}
      />
    </Card>
  );
}
