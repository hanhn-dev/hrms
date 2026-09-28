"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Input,
  Segmented,
  Space,
  Table,
  Tag,
} from "antd";
import { getChangeRequestDetail } from "@/features/employer/workflows/change-request-actions";
import { ChangeRequestDecideModal } from "@/features/employer/workflows/change-request-decide-modal";
import { ChangeRequestDetailModal } from "@/features/employer/workflows/change-request-detail-modal";
import {
  EmployeeNameLink,
  NameChips,
  WorkflowChip,
  splitNames,
} from "@/features/employer/workflows/change-request-labels";
import type {
  ChangeRequestDetail,
  ChangeRequestListItem,
  ConfiguredApproverGroup,
} from "@/features/employer/workflows/queries";
import { formatDate } from "@/shared/format-date";

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
}: {
  employerId: number;
  requests: ChangeRequestListItem[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ChangeRequestDetail | null>(null);
  const [approvers, setApprovers] = useState<ConfiguredApproverGroup[]>([]);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"Approved" | "Rejected" | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

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
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [requests, search, statusFilter]);

  async function openRequest(
    changeRequestId: number,
    status: "Approved" | "Rejected",
  ): Promise<void> {
    setViewOpen(false);
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
    setViewOpen(true);
    if (selectedId === changeRequestId && detail != null) {
      return;
    }
    await loadRequest(changeRequestId);
  }

  async function loadRequest(changeRequestId: number): Promise<boolean> {
    setSelectedId(changeRequestId);
    setDetail(null);
    setApprovers([]);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const result = await getChangeRequestDetail(employerId, changeRequestId);
      setDetail(result.detail);
      setApprovers(result.approvers);
      return true;
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to load change request.");
      return false;
    } finally {
      setDetailLoading(false);
    }
  }

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
            placeholder="Search name, emp no, page, or section"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        <Table
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
            { title: "Id", dataIndex: "changeRequestId", width: 80 },
            {
              title: "Employee",
              render: (_: unknown, row: ChangeRequestListItem) => (
                <EmployeeNameLink
                  employerId={employerId}
                  name={row.employeeName}
                  employmentNumber={row.employmentNumber}
                />
              ),
            },
            { title: "Page", dataIndex: "pageName" },
            {
              title: "Sections",
              render: (_: unknown, row: ChangeRequestListItem) => (
                <NameChips names={splitNames(row.sectionNames)} />
              ),
            },
            {
              title: "Workflow",
              render: (_: unknown, row: ChangeRequestListItem) => (
                <WorkflowChip name={row.workflowName} />
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

      <ChangeRequestDetailModal
        detail={viewOpen ? detail : null}
        employerId={employerId}
        error={viewOpen ? detailError : null}
        loading={viewOpen && detailLoading}
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
        }}
      />

      <ChangeRequestDecideModal
        approvers={approvers}
        detail={detail}
        employerId={employerId}
        open={confirmStatus != null && detail != null}
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
