import { Alert, Card, Table } from "antd";
import { getEmployeeLeaveBalances } from "@/features/employee/leave/queries";
import { formatDate } from "@/shared/format-date";
import { Employee360Nav } from "@/shared/ui";

export async function EmployeeLeaveScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const balances = await getEmployeeLeaveBalances(employerId, employmentNumber);

  return (
    <>
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      <Alert
        className="mb-4"
        showIcon
        type="info"
        title="Raw tLeaveBalance rows"
        description="This is the stored balance, not SP_LA_GetEmployeeLeaveBalanceDetails eligibility/pending math."
      />
      <Card>
        <Table
          rowKey="transId"
          dataSource={balances.map((row) => ({
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
    </>
  );
}
