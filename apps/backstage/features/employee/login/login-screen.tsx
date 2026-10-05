import { captureQueryScript } from "@hrms/db";
import { Alert, Card, Descriptions } from "antd";
import Link from "next/link";
import { ResetPasswordButton } from "@/features/employee/login/reset-password-button";
import { UnlockAccountButton } from "@/features/employee/login/unlock-account-button";
import { getEmployeeLoginInfo } from "@/features/employee/login/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { formatDate } from "@/shared/format-date";
import { DataTable, Employee360Nav } from "@/shared/ui";

export async function EmployeeLoginScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const loaded = await captureQueryScript(() =>
    getEmployeeLoginInfo(employerId, employmentNumber),
  );
  const { login, attempts } = loaded.result;
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());
  const writeDisabled = !writesEnabled || !login?.userId;
  const writeDisabledReason = !writesEnabled
    ? "Writes are disabled."
    : !login?.userId
      ? "No TUsers row for this employee."
      : undefined;

  return (
    <>
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      <div className="mb-4 flex items-center justify-end gap-2">
        <Link
          href={`/employers/${employerId}/logs?employee=${encodeURIComponent(employmentNumber)}`}
        >
          Application logs
        </Link>
        <ResetPasswordButton
          disabled={writeDisabled}
          disabledReason={writeDisabledReason}
          employerId={employerId}
          employmentNumber={employmentNumber}
        />
        <UnlockAccountButton
          disabled={writeDisabled}
          disabledReason={writeDisabledReason}
          employerId={employerId}
          employmentNumber={employmentNumber}
        />
      </div>
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
        <DataTable
          queryScript={loaded.script}
          rowKey="deviceLoginAttemptId"
          dataSource={attempts.map((attempt) => ({
            ...attempt,
            loginAttemptedAt: formatDate(attempt.loginAttemptedAt),
          }))}
          size="small"
          scroll={{ x: "max-content" }}
          columns={[
            { title: "When", dataIndex: "loginAttemptedAt" },
            { title: "Device", dataIndex: "deviceId" },
            { title: "Reason", dataIndex: "reason" },
          ]}
        />
      </Card>
    </>
  );
}
