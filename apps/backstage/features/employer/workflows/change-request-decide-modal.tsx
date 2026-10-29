"use client";

import { useState } from "react";
import { App, Input, Modal, Space, Typography } from "antd";
import { ChangeRequestSummary } from "@/features/employer/workflows/change-request-summary";
import {
  commitDecideChangeRequest,
  previewDecideChangeRequest,
} from "@/features/employer/workflows/mutations";
import { SearchSelect } from "@/shared/ui";
import { EntityLink } from "@/shared/entity-link";
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
  queryScript,
  approvers,
  writesEnabled,
  onClose,
  onDone,
}: {
  open: boolean;
  status: "Approved" | "Rejected";
  employerId: number;
  detail: ChangeRequestDetail | null;
  queryScript: string;
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
  const approverOptions = groups;

  const enabledApproverIds = approverOptions.flatMap((group) =>
        group.options.filter((option) => !option.disabled).map((option) => option.value),
      );
  const decideKey = [
    open ? "open" : "closed",
    status,
    String(detail?.header.changeRequestId ?? ""),
    (detail?.pendingApprovers ?? []).map((person) => person.employeeId).join(","),
    approvers
      .map((group) => `${group.roleName}:${group.people.map((person) => person.employeeId).join(",")}`)
      .join("|"),
  ].join("\0");
  const [appliedDecideKey, setAppliedDecideKey] = useState<string | null>(null);
  if (decideKey !== appliedDecideKey) {
    setAppliedDecideKey(decideKey);
    if (open) {
      setError(null);
      setComments(status === "Approved" ? "Approved from Troubleshooter" : "Rejected from Troubleshooter");
      const pendingId = detail?.pendingApprovers[0]?.employeeId;
      setApproverEmployeeId(
        pendingId != null && enabledApproverIds.includes(pendingId) ? pendingId : (enabledApproverIds[0] ?? null),
      );
    }
  }

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
        {detail ? (
          <ChangeRequestSummary
            detail={detail}
            employerId={employerId}
            queryScript={queryScript}
          />
        ) : null}

        <label className="flex flex-col gap-1">
          <span>Approver</span>
          <SearchSelect
            optionFilterProp="label"
            options={approverOptions}
            placeholder="Select an approver"
            value={approverEmployeeId}
            onChange={(value: number) => {
              setApproverEmployeeId(value);
            }}
          />
          {enabledApproverIds.length === 0 ? (
            <Typography.Text type="danger">
              No approver is configured on this workflow.
            </Typography.Text>
          ) : (
            <Space size={8} wrap>
              {approverPeople(approvers, detail).map((person) => (
                <EntityLink
                  key={person.employeeId}
                  employerId={employerId}
                  entity={
                    person.employmentNumber
                      ? { kind: "employee", employmentNumber: person.employmentNumber }
                      : null
                  }
                >
                  {personLabel(person)}
                </EntityLink>
              ))}
            </Space>
          )}
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

function approverPeople(
  groups: ConfiguredApproverGroup[],
  detail: ChangeRequestDetail | null,
): Array<{ employeeId: number; name: string; employmentNumber: string | null }> {
  const people = new Map<
    number,
    { employeeId: number; name: string; employmentNumber: string | null }
  >();
  for (const group of groups) {
    for (const person of group.people) {
      people.set(person.employeeId, person);
    }
  }
  for (const person of detail?.pendingApprovers ?? []) {
    if (!people.has(person.employeeId)) {
      people.set(person.employeeId, person);
    }
  }
  return [...people.values()];
}
