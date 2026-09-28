"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Input, Modal, Select, Space, Typography } from "antd";
import { ChangeRequestSummary } from "@/features/employer/workflows/change-request-summary";
import {
  commitDecideChangeRequest,
  previewDecideChangeRequest,
} from "@/features/employer/workflows/mutations";
import type {
  ChangeRequestDetail,
  ConfiguredApproverGroup,
} from "@/features/employer/workflows/queries";

function personLabel(person: {
  name: string;
  employmentNumber: string | null;
}): string {
  return person.employmentNumber ? `${person.name} · ${person.employmentNumber}` : person.name;
}

export function ChangeRequestDecideModal({
  open,
  status,
  employerId,
  detail,
  approvers,
  writesEnabled,
  onClose,
  onDone,
}: {
  open: boolean;
  status: "Approved" | "Rejected";
  employerId: number;
  detail: ChangeRequestDetail | null;
  approvers: ConfiguredApproverGroup[];
  writesEnabled: boolean;
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const { message } = App.useApp();
  const [approverEmployeeId, setApproverEmployeeId] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const approverOptions = useMemo(() => {
    const pendingIds = new Set(detail?.pendingApprovers.map((person) => person.employeeId) ?? []);
    const groups = approvers
      .map((group) => ({
        label: group.roleName,
        options: group.people.map((person) => ({
          value: person.employeeId,
          label: `${personLabel(person)}${person.pending || pendingIds.has(person.employeeId) ? " · in queue" : ""}`,
          disabled: false,
        })),
      }))
      .filter((group) => group.options.length > 0);
    const seen = new Set(approvers.flatMap((group) => group.people.map((person) => person.employeeId)));
    const extra = (detail?.pendingApprovers ?? []).filter((person) => !seen.has(person.employeeId));
    if (extra.length > 0) {
      groups.push({
        label: "Pending queue",
        options: extra.map((person) => ({
          value: person.employeeId,
          label: personLabel(person),
          disabled: false,
        })),
      });
    }
    return groups;
  }, [approvers, detail]);

  const enabledApproverIds = useMemo(
    () =>
      approverOptions.flatMap((group) =>
        group.options.filter((option) => !option.disabled).map((option) => option.value),
      ),
    [approverOptions],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setComments(status === "Approved" ? "Approved from Troubleshooter" : "Rejected from Troubleshooter");
    const enabled = approverOptions.flatMap((group) =>
      group.options.filter((option) => !option.disabled).map((option) => option.value),
    );
    const pendingId = detail?.pendingApprovers[0]?.employeeId;
    setApproverEmployeeId(
      pendingId != null && enabled.includes(pendingId) ? pendingId : (enabled[0] ?? null),
    );
  }, [approverOptions, open, status, detail?.header.changeRequestId, detail?.pendingApprovers]);

  const canCommit =
    writesEnabled &&
    detail?.header.status === "pending" &&
    detail.header.workflowId != null &&
    approverEmployeeId != null &&
    enabledApproverIds.includes(approverEmployeeId) &&
    comments.trim().length > 0;

  async function commit(): Promise<void> {
    if (!detail || !canCommit || loading) {
      return;
    }
    const workflowId = detail.header.workflowId;
    if (workflowId == null || approverEmployeeId == null) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const preview = await previewDecideChangeRequest({
        employerId,
        workflowId,
        changeRequestId: detail.header.changeRequestId,
        approverEmployeeId,
        status,
        comments,
      });
      await commitDecideChangeRequest(preview.token);
      message.success(`Change request ${status.toLowerCase()}.`);
      onDone();
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Commit failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      confirmLoading={loading}
      destroyOnHidden
      okButtonProps={{ disabled: !canCommit, danger: status === "Rejected" }}
      okText={status === "Approved" ? "Approve" : "Reject"}
      open={open}
      title={status === "Approved" ? "Approve change request" : "Reject change request"}
      width={840}
      onCancel={() => {
        if (!loading) {
          onClose();
        }
      }}
      onOk={() => {
        void commit();
      }}
    >
      <Space className="w-full" orientation="vertical" size="middle">
        {error ? <Typography.Paragraph type="danger">{error}</Typography.Paragraph> : null}
        {detail ? <ChangeRequestSummary detail={detail} employerId={employerId} /> : null}

        <label className="flex flex-col gap-1">
          <span>Approver</span>
          <Select
            optionFilterProp="label"
            options={approverOptions}
            placeholder="Select an approver"
            showSearch
            value={approverEmployeeId}
            onChange={(value: number) => {
              setApproverEmployeeId(value);
            }}
          />
          {enabledApproverIds.length === 0 ? (
            <Typography.Text type="danger">
              No approver is configured on this workflow.
            </Typography.Text>
          ) : null}
        </label>

        <label className="flex flex-col gap-1">
          <span>Comments</span>
          <Input.TextArea
            maxLength={2000}
            rows={3}
            value={comments}
            onChange={(event) => {
              setComments(event.target.value);
            }}
          />
        </label>
      </Space>
    </Modal>
  );
}
