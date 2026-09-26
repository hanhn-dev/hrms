import { Alert, Card, Descriptions, Table } from "antd";
import { UnlockAccountButton } from "@/features/employee/login/unlock-account-button";
import { getEmployeeLoginInfo } from "@/features/employee/login/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { formatDate } from "@/shared/format-date";
import { Employee360Nav, PageHeader } from "@/shared/ui";

export async function EmployeeLoginScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const { login, attempts } = await getEmployeeLoginInfo(
    employerId,
    employmentNumber,
  );
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <>
      <PageHeader
        extra={
          <UnlockAccountButton
            disabled={!writesEnabled || !login?.userId}
            disabledReason={
              !writesEnabled
                ? "Writes are disabled."
                : !login?.userId
                  ? "No TUsers row for this employee."
                  : undefined
            }
            employerId={employerId}
            employmentNumber={employmentNumber}
          />
        }
      />
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      {!login?.userId ? (
        <Alert
          className="mb-4"
          showIcon
          type="warning"
          title="No TUsers row was found for this employee at this employer."
        />
      ) : null}
      <Card className="mb-4" title="Account">
        <Descriptions
          bordered
          column={2}
          size="small"
          items={[
            { key: "userId", label: "UserID", children: login?.userId ?? "—" },
            { key: "userName", label: "UserName", children: login?.userName ?? "—" },
            { key: "role", label: "Role", children: login?.roleName ?? "—" },
            {
              key: "userActive",
              label: "User active",
              children: String(login?.userIsActive ?? ""),
            },
            {
              key: "locked",
              label: "Locked",
              children: String(login?.isUserIdLocked ?? ""),
            },
            {
              key: "invalidAttempts",
              label: "Invalid attempts",
              children: login?.invalidLoginAttemptCount ?? "—",
            },
            {
              key: "forcePasswordChange",
              label: "Force password change",
              children: String(login?.isForceToChangePassword ?? ""),
            },
            {
              key: "passwordChanged",
              label: "Password changed",
              children: formatDate(login?.passwordChangedDate),
            },
            {
              key: "failedAttemptsPolicy",
              label: "Tenant FailedAttempts",
              children: login?.failedAttemptsPolicy ?? "—",
            },
            {
              key: "passwordExpires",
              label: "Password expires",
              children: login?.passwordExpires ?? "—",
            },
          ]}
        />
      </Card>
      <Card title="Recent failed logins">
        <Table
          rowKey="deviceLoginAttemptId"
          dataSource={attempts.map((attempt) => ({
            ...attempt,
            loginAttemptedAt: formatDate(attempt.loginAttemptedAt),
          }))}
          size="small"
          scroll={{ x: "max-content" }}
          columns={[
            { title: "When (IST)", dataIndex: "loginAttemptedAt" },
            { title: "Device", dataIndex: "deviceId" },
            { title: "Reason", dataIndex: "reason" },
          ]}
        />
      </Card>
    </>
  );
}
