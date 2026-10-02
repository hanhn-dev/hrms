"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Input,
  Segmented,
  Space,
  Tag,
} from "antd";
import { DataTable } from "@/shared/ui/data-table";
import { getChangeRequestDetail } from "@/features/employer/workflows/change-request-actions";
import { ChangeRequestDecideModal } from "@/features/employer/workflows/change-request-decide-modal";
import {
  ChangeRequestIdButton,
  useChangeRequestView,
} from "@/features/employer/workflows/change-request-view";
import { changeRequestApproverSearchValues } from "@/features/employer/workflows/change-request-approver-label";
import {
  ChangeRequestApprovers,
  changeKindFromRow,
  sectionNamesFrom,
  splitNames,
} from "@/features/employer/workflows/change-request-labels";
import type {
  ChangeRequestDetail,
  ChangeRequestListItem,
  ConfiguredApproverGroup,
} from "@/features/employer/workflows/queries";
import { formatDate } from "@/shared/format-date";
import { EntityLink } from "@/shared/entity-link";
import { workflowsHref } from "@/features/employer/workflows/workflows-source";

const STATUS_FILTERS = ["pending", "approved", "rejected", "all"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLOR: Record<ChangeRequestListItem["status"], string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

export function ChangeRequestPanel({
  employerId,
  requests,
  writesEnabled,
  requestId,
  queryScript,
}: {
  employerId: number;
  requests: ChangeRequestListItem[];
  writesEnabled: boolean;
  requestId: number | null;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ChangeRequestDetail | null>(null);
  const [detailScript, setDetailScript] = useState("");
  const [approvers, setApprovers] = useState<ConfiguredApproverGroup[]>([]);
  const [confirmStatus, setConfirmStatus] = useState<"Approved" | "Rejected" | null>(null);
  const changeRequestView = useChangeRequestView(employerId, {
    onClose: () => {
      if (requestId != null) {
        router.push(workflowsHref(employerId, "requests"));
      }
    },
  });

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        String(row.changeRequestId),
        row.employeeName,
        row.employmentNumber,
        row.pageName,
        row.sectionNames,
        row.createdByName,
        row.createdByEmploymentNumber,
        row.workflowName,
        ...changeRequestApproverSearchValues(row.approvers),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [requests, search, statusFilter]);

  async function openRequest(
    changeRequestId: number,
    status: "Approved" | "Rejected",
  ): Promise<void> {
    changeRequestView.hide();
    const loaded =
      selectedId === changeRequestId && detail != null
        ? true
        : await loadRequest(changeRequestId);
    if (loaded) {
      setConfirmStatus(status);
    }
  }

  async function openView(changeRequestId: number): Promise<void> {
    setConfirmStatus(null);
    setSelectedId(changeRequestId);
    await changeRequestView.openView(changeRequestId);
  }

  const loadRequest = useCallback(async (changeRequestId: number): Promise<boolean> => {
    setSelectedId(changeRequestId);
    setDetail(null);
    setDetailScript("");
    setApprovers([]);
    try {
      const result = await getChangeRequestDetail(employerId, changeRequestId);
      setDetail(result.detail);
      setDetailScript(result.queryScript);
      setApprovers(result.approvers);
      return true;
    } catch {
      return false;
    }
  }, [employerId]);

  useEffect(() => {
    if (requestId == null) {
      return;
    }
    setConfirmStatus(null);
    setSelectedId(requestId);
    void changeRequestView.openView(requestId);
  }, [changeRequestView.openView, requestId]);

  return (
    <>
      <Space className="w-full" orientation="vertical" size="middle">
        {!writesEnabled ? (
          <Alert
            showIcon
            type="warning"
            title="Writes are disabled in this environment. Enable TROUBLESHOOTER_WRITES_ENABLED on a non-production env to approve or reject."
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            options={STATUS_FILTERS.map((value) => ({
              label: value[0]?.toUpperCase() + value.slice(1),
              value,
            }))}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as StatusFilter);
            }}
          />
          <Input.Search
            allowClear
            className="max-w-sm"
            placeholder="Search name, emp no, page, section, or approver"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        <DataTable
          queryScript={queryScript}
          rowKey="changeRequestId"
          size="small"
          dataSource={visible}
          pagination={{ pageSize: 10, showTotal: (total) => `${total} requests` }}
          rowClassName={(row) =>
            row.changeRequestId === selectedId ? "ant-table-row-selected" : ""
          }
          onRow={(row) => ({
            onClick: () => {
              void openView(row.changeRequestId);
            },
          })}
          columns={[
            {
              title: "Id",
              dataIndex: "changeRequestId",
              width: 80,
              render: (changeRequestId: number) => (
                <ChangeRequestIdButton
                  changeRequestId={changeRequestId}
                  onOpen={(id) => {
                    void openView(id);
                  }}
                />
              ),
            },
            {
              title: "Employee",
              render: (_: unknown, row: ChangeRequestListItem) => (
                <EntityLink
                  employerId={employerId}
                  entity={
                    row.employmentNumber
                      ? { kind: "employee", employmentNumber: row.employmentNumber }
                      : null
                  }
                >
                  {row.employmentNumber
                    ? `${row.employeeName} · ${row.employmentNumber}`
                    : row.employeeName}
                </EntityLink>
              ),
            },
            {
              title: "Page",
              dataIndex: "pageName",
              render: (pageName: string | null) => (
                <EntityLink
                  employerId={employerId}
                  entity={pageName ? { kind: "workflowPage", pageName } : null}
                >
                  {pageName ?? "—"}
                </EntityLink>
              ),
            },
            {
              title: "Sections",
              render: (_: unknown, row: ChangeRequestListItem) => (
                <SectionChips employerId={employerId} names={splitNames(row.sectionNames)} />
              ),
            },
            {
              title: "Workflow",
              render: (_: unknown, row: ChangeRequestListItem) =>
                row.workflowName ? (
                  <EntityLink
                    appearance="tag"
                    color="blue"
                    employerId={employerId}
                    entity={
                      row.workflowId != null
                        ? { kind: "workflow", workflowId: row.workflowId }
                        : null
                    }
                  >
                    {row.workflowName}
                  </EntityLink>
                ) : (
                  "—"
                ),
            },
            {
              title: "Requested by",
              render: (_: unknown, row: ChangeRequestListItem) =>
                row.createdByName
                  ? `${row.createdByName}${
                      row.createdByEmploymentNumber ? ` · ${row.createdByEmploymentNumber}` : ""
                    }`
                  : "—",
            },
            {
              title: "Approver",
              render: (_: unknown, row: ChangeRequestListItem) => (
                <ChangeRequestApprovers employerId={employerId} approvers={row.approvers} />
              ),
            },
            {
              title: "Requested",
              dataIndex: "requestedDate",
              render: (value: string | null) => formatDate(value),
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (status: ChangeRequestListItem["status"]) => (
                <Tag color={STATUS_COLOR[status]}>{status}</Tag>
              ),
            },
            {
              title: "Actions",
              width: 240,
              render: (_: unknown, row: ChangeRequestListItem) =>
                row.status === "pending" ? (
                  <Space>
                    <Button
                      size="small"
                      type="link"
                      className="!px-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        void openView(row.changeRequestId);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      disabled={!writesEnabled}
                      size="small"
                      type="primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void openRequest(row.changeRequestId, "Approved");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      danger
                      disabled={!writesEnabled}
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        void openRequest(row.changeRequestId, "Rejected");
                      }}
                    >
                      Reject
                    </Button>
                  </Space>
                ) : (
                  <Button
                    size="small"
                    type="link"
                    className="!px-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      void openView(row.changeRequestId);
                    }}
                  >
                    View
                  </Button>
                ),
            },
          ]}
        />

      </Space>

      {changeRequestView.modal}

      <ChangeRequestDecideModal
        approvers={approvers}
        detail={detail}
        employerId={employerId}
        open={confirmStatus != null && detail != null}
        queryScript={detailScript}
        status={confirmStatus ?? "Approved"}
        writesEnabled={writesEnabled}
        onClose={() => {
          setConfirmStatus(null);
        }}
        onDone={() => {
          setConfirmStatus(null);
          setSelectedId(null);
          setDetail(null);
          router.refresh();
        }}
      />
    </>
  );
}

function SectionChips({
  employerId,
  names,
}: {
  employerId: number;
  names: string[];
}): React.JSX.Element {
  if (names.length === 0) {
    return <>{"—"}</>;
  }
  return (
    <Space size={4} wrap>
      {names.map((name) => (
        <EntityLink
          key={name}
          appearance="tag"
          color="blue"
          employerId={employerId}
          entity={{ kind: "fieldSection", section: name }}
        >
          {name}
        </EntityLink>
      ))}
    </Space>
  );
}
