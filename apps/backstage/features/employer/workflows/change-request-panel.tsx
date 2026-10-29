"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { ChangeRequestStatusCounts } from "@hrms/db";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
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
import {
  ChangeRequestApprovers,
  splitNames,
} from "@/features/employer/workflows/change-request-labels";
import type {
  ChangeRequestDetail,
  ChangeRequestListItem,
  ConfiguredApproverGroup,
} from "@/features/employer/workflows/queries";
import { formatDate } from "@/shared/format-date";
import { EntityLink } from "@/shared/entity-link";
import { listHref } from "@/shared/list-query";
import { statusTabLabel } from "@/features/employee/change-requests/group";
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
  page,
  pageSize,
  requests,
  search,
  status,
  statusCounts,
  total,
  writesEnabled,
  requestId,
  queryScript,
}: {
  employerId: number;
  page: number;
  pageSize: number;
  requests: ChangeRequestListItem[];
  search: string;
  status: StatusFilter;
  statusCounts: ChangeRequestStatusCounts;
  total: number;
  writesEnabled: boolean;
  requestId: number | null;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  function openList(next: { page?: number; q?: string | null; status?: StatusFilter }): void {
    router.push(
      listHref(
        `/employers/${employerId}/workflows`,
        { page: next.page ?? 1, q: next.q === undefined ? search || null : next.q },
        {
          tab: "requests",
          status: (next.status ?? status) === "pending" ? null : (next.status ?? status),
          request: requestId,
        },
        { pageParam: "p" },
      ),
    );
  }
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

  const loadRequest = async (changeRequestId: number): Promise<boolean> => {
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
  };

  const openFromRoute = useEffectEvent((id: number) => {
    void changeRequestView.openView(id);
  });
  const routeKey = requestId == null ? null : `${employerId}:${requestId}`;
  const [appliedRouteKey, setAppliedRouteKey] = useState<string | null>(null);
  if (routeKey !== appliedRouteKey) {
    setAppliedRouteKey(routeKey);
    if (requestId != null) {
      setConfirmStatus(null);
      setSelectedId(requestId);
    }
  }

  useEffect(() => {
    if (requestId == null) {
      return;
    }
    void openFromRoute(requestId);
  }, [employerId, requestId]);

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
              label: statusTabLabel(value, statusCounts[value]),
              value,
            }))}
            value={status}
            onChange={(value) => {
              openList({ page: 1, status: value as StatusFilter });
            }}
          />
        </div>
        <DataTable
          queryScript={queryScript}
          rowKey="changeRequestId"
          size="small"
          dataSource={requests}
          searchQuery={search}
          onSearch={(next) => {
            openList({ page: 1, q: next || null });
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (count) => `${count} requests`,
            onChange: (next) => {
              openList({ page: next });
            },
          }}
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
