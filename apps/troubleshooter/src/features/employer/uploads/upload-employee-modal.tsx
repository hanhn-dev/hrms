"use client";

import { Alert, Descriptions, Modal, Space, Table, Tabs } from "antd";
import Link from "next/link";
import { AccessActions } from "@/features/employee/access/access-actions";
import { AccessTreesTabs } from "@/features/employee/access/access-trees-tabs";
import type { getEmployeeAccess } from "@/features/employee/access/queries";
import { UnlockAccountButton } from "@/features/employee/login/unlock-account-button";
import type { EmployeeLoginInfo, EmployeeProfile, FailedLoginAttempt } from "@hrms/db";
import type { UploadLiveRow } from "@/features/employer/uploads/queries";
import { formatDate } from "@/shared/format-date";

type EmployeeAccess = Awaited<ReturnType<typeof getEmployeeAccess>>;

export function UploadEmployeeModal({
  employerId,
  open,
  liveRow,
  profile,
  access,
  login,
  attempts,
  writesEnabled,
  onClose,
}: {
  employerId: number;
  open: boolean;
  liveRow: UploadLiveRow | null;
  profile: EmployeeProfile | null;
  access: EmployeeAccess | null;
  login: EmployeeLoginInfo | null;
  attempts: FailedLoginAttempt[];
  writesEnabled: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const employmentNumber =
    profile?.employmentNumber ?? liveRow?.employmentNumber ?? null;
  const employeeHref = employmentNumber
    ? `/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}`
    : null;

  return (
    <Modal
      title={profile?.fullName ?? liveRow?.fullName ?? "Employee"}
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
      destroyOnHidden
    >
      {!profile && !liveRow ? (
        <Alert
          showIcon
          type="warning"
          title="No TEmployee row was found for this ID at this employer."
        />
      ) : (
        <>
          <Space className="mb-3" wrap>
            {employeeHref ? (
              <>
                <Link href={employeeHref}>Open profile</Link>
                <Link href={`${employeeHref}/access`}>Open access</Link>
                <Link href={`${employeeHref}/login`}>Open login</Link>
                <Link href={`${employeeHref}/leave`}>Open leave</Link>
              </>
            ) : (
              <span className="text-slate-500">
                This employee has no EmploymentNumber, so the full employee pages
                cannot be opened.
              </span>
            )}
          </Space>
          <Tabs
            items={[
              {
                key: "profile",
                label: "Profile",
                children: (
                  <EmployeeProfilePane profile={profile} liveRow={liveRow} />
                ),
              },
              {
                key: "access",
                label: "Access",
                children:
                  access && employmentNumber ? (
                    <>
                      <p className="mb-3">
                        Role: {access.roleName ?? "none"}
                      </p>
                      <AccessActions
                        currentRoleId={access.roleId}
                        employerId={employerId}
                        employmentNumber={employmentNumber}
                        roles={access.roles}
                        writesEnabled={writesEnabled}
                      />
                      <div className="mt-4">
                        <AccessTreesTabs
                          employerId={employerId}
                          employmentNumber={employmentNumber}
                          tabMasterNote={access.tabMaster?.likelyCause}
                          tabMasterTone={
                            access.tabMaster?.tabMasterRows === 0
                              ? "warning"
                              : "success"
                          }
                          tree={access.tree}
                          tabTree={access.tabTree}
                          writesEnabled={writesEnabled}
                        />
                      </div>
                    </>
                  ) : (
                    <Alert
                      showIcon
                      type="info"
                      title="Access tools need a live TEmployee / TEmployeeInfo row."
                    />
                  ),
              },
              {
                key: "login",
                label: "Login",
                children:
                  employmentNumber ? (
                    <EmployeeLoginPane
                      employerId={employerId}
                      employmentNumber={employmentNumber}
                      login={login}
                      attempts={attempts}
                      writesEnabled={writesEnabled}
                    />
                  ) : (
                    <Alert
                      showIcon
                      type="info"
                      title="Login tools need a live TEmployee / TEmployeeInfo row."
                    />
                  ),
              },
            ]}
          />
        </>
      )}
    </Modal>
  );
}

function EmployeeProfilePane({
  profile,
  liveRow,
}: {
  profile: EmployeeProfile | null;
  liveRow: UploadLiveRow | null;
}): React.JSX.Element {
  return (
    <Descriptions
      bordered
      column={2}
      size="small"
      items={[
        {
          key: "employeeId",
          label: "EmployeeId",
          children: profile?.employeeId ?? liveRow?.employeeId ?? "—",
        },
        {
          key: "employmentNumber",
          label: "Employment number",
          children: profile?.employmentNumber ?? liveRow?.employmentNumber ?? "—",
        },
        {
          key: "name",
          label: "Name",
          children: profile?.fullName ?? liveRow?.fullName ?? "—",
        },
        {
          key: "role",
          label: "Role",
          children: profile?.roleName ?? "—",
        },
        {
          key: "workEmail",
          label: "Work email",
          children: profile?.workEmail ?? liveRow?.workEmail ?? "—",
        },
        {
          key: "personalEmail",
          label: "Personal email",
          children: profile?.personalEmail ?? "—",
        },
        { key: "phone", label: "Phone", children: profile?.cellNumber ?? "—" },
        {
          key: "active",
          label: "Active",
          children: String(profile?.isActive ?? liveRow?.isActive ?? ""),
        },
        {
          key: "designation",
          label: "Designation",
          children: profile?.designation ?? "—",
        },
        {
          key: "employmentType",
          label: "Employment type",
          children: profile?.employmentType ?? "—",
        },
        {
          key: "location",
          label: "Location",
          children: profile?.locationName ?? "—",
        },
        {
          key: "businessUnit",
          label: "Business unit",
          children: profile?.businessUnitName ?? "—",
        },
        {
          key: "doj",
          label: "DOJ",
          children: formatDate(profile?.dateOfJoining),
        },
      ]}
    />
  );
}

function EmployeeLoginPane({
  employerId,
  employmentNumber,
  login,
  attempts,
  writesEnabled,
}: {
  employerId: number;
  employmentNumber: string;
  login: EmployeeLoginInfo | null;
  attempts: FailedLoginAttempt[];
  writesEnabled: boolean;
}): React.JSX.Element {
  return (
    <>
      <div className="mb-3">
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
      </div>
      {!login?.userId ? (
        <Alert
          className="mb-3"
          showIcon
          type="warning"
          title="No TUsers row was found for this employee at this employer."
        />
      ) : null}
      <Descriptions
        bordered
        column={2}
        size="small"
        className="mb-3"
        items={[
          { key: "userId", label: "UserID", children: login?.userId ?? "—" },
          { key: "userName", label: "UserName", children: login?.userName ?? "—" },
          { key: "role", label: "Role", children: login?.roleName ?? "—" },
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
        ]}
      />
      <Table
        rowKey="deviceLoginAttemptId"
        dataSource={attempts}
        size="small"
        pagination={false}
        locale={{ emptyText: "No recent failed logins." }}
        columns={[
          {
            title: "When",
            dataIndex: "loginAttemptedAt",
            render: (value: string | null) => formatDate(value),
          },
          { title: "Device", dataIndex: "deviceId" },
          { title: "Reason", dataIndex: "reason" },
        ]}
      />
    </>
  );
}
