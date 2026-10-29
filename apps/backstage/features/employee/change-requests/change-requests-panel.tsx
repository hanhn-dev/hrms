"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { App, Button, Collapse, Empty, Pagination, Segmented, Space, Tag } from "antd";
import { listHref } from "@/shared/list-query";
import { DataTable } from "@/shared/ui/data-table";
import {
  ChangeRequestApprovers,
  splitNames,
} from "@/features/employer/workflows/change-request-labels";
import { getChangeRequestDetail } from "@/features/employer/workflows/change-request-actions";
import { ChangeRequestDecideModal } from "@/features/employer/workflows/change-request-decide-modal";
import {
  ChangeRequestIdButton,
  useChangeRequestView,
} from "@/features/employer/workflows/change-request-view";
import {
  changeRequestDecideActions,
  type ChangeRequestDecideStatus,
} from "@/features/employee/change-requests/decide-actions";
import type { ChangeRequestListItem } from "@/features/employee/change-requests/queries";
import {
  expandedWorkflowGroupKeys,
  groupChangeRequestsByWorkflow,
  requestCountLabel,
  workflowGroupCaption,
} from "@/features/employee/change-requests/group";
import type {
  ChangeRequestDetail,
  ConfiguredApproverGroup,
} from "@/features/employer/workflows/queries";
import { formatDate } from "@/shared/format-date";
import { EntityLink } from "@/shared/entity-link";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLOR: Record<ChangeRequestListItem["status"], string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

export function ChangeRequestsPanel({
  employerId,
  employmentNumber,
  page,
  pageSize,
  requests,
  search,
  status,
  total,
  queryScript,
  writesEnabled,
}: {
  employerId: number;
  employmentNumber: string;
  page: number;
  pageSize: number;
  requests: ChangeRequestListItem[];
  search: string;
  status: StatusFilter;
  total: number;
  queryScript: string;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const { message } = App.useApp();
  const path = `/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}/change-requests`;
  function openList(next: { page?: number; q?: string | null; status?: StatusFilter }): void {
    const nextStatus = next.status ?? status;
    router.push(
      listHref(path, {
        page: next.page ?? 1,
        q: next.q === undefined ? search || null : next.q,
      }, {
        status: nextStatus === "all" ? null : nextStatus,
      }),
    );
  }
  const [openOverride, setOpenOverride] = useState<{
    signature: string;
    keys: string[];
  } | null>(null);
  const [decideStatus, setDecideStatus] =
    useState<ChangeRequestDecideStatus | null>(null);
  const [decideDetail, setDecideDetail] = useState<ChangeRequestDetail | null>(
    null,
  );
  const [decideScript, setDecideScript] = useState("");
  const [decideApprovers, setDecideApprovers] = useState<
    ConfiguredApproverGroup[]
  >([]);
  const [decideLoading, setDecideLoading] = useState<{
    changeRequestId: number;
    status: ChangeRequestDecideStatus;
  } | null>(null);
  const changeRequestView = useChangeRequestView(employerId);

  async function openDecide(
    changeRequestId: number,
    status: ChangeRequestDecideStatus,
  ): Promise<void> {
    setDecideLoading({ changeRequestId, status });
    try {
      const result = await getChangeRequestDetail(employerId, changeRequestId);
      setDecideDetail(result.detail);
      setDecideScript(result.queryScript);
      setDecideApprovers(result.approvers);
      setDecideStatus(status);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to load change request.",
      );
    } finally {
      setDecideLoading(null);
    }
  }

  const groups = groupChangeRequestsByWorkflow(requests);
  const groupSignature = `${status}|${groups.map((group) => group.key).join(",")}`;
  const activeKeys =
    openOverride?.signature === groupSignature
      ? openOverride.keys
      : expandedWorkflowGroupKeys(groups);

  return (
    <>
      <Space className="w-full" orientation="vertical" size="middle">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            options={STATUS_FILTERS.map((value) => ({
              label: value[0]?.toUpperCase() + value.slice(1),
              value,
            }))}
            value={status}
            onChange={(value) => {
              openList({ page: 1, status: value as StatusFilter });
            }}
          />
        </div>
        {total === 0 ? (
          <Empty description="No change requests match." />
        ) : (
          <Collapse
            activeKey={activeKeys}
            onChange={(keys) => {
              const next = Array.isArray(keys)
                ? keys.map(String)
                : [String(keys)];
              setOpenOverride({ signature: groupSignature, keys: next });
            }}
            items={groups.map((group) => {
              const caption = workflowGroupCaption(
                group,
                groups,
                group.workflowCreatedDate
                  ? formatDate(group.workflowCreatedDate)
                  : null,
              );
              return {
                key: group.key,
                label: (
                  <Space size={8} wrap>
                    <EntityLink
                      appearance="tag"
                      color="blue"
                      employerId={employerId}
                      entity={
                        group.workflowId != null
                          ? { kind: "workflow", workflowId: group.workflowId }
                          : null
                      }
                    >
                      {group.workflowName}
                    </EntityLink>
                    {caption ? <Tag>{caption}</Tag> : null}
                    <Tag>{requestCountLabel(group.requests.length)}</Tag>
                    {group.pendingCount > 0 ? (
                      <Tag color="orange">{group.pendingCount} pending</Tag>
                    ) : null}
                  </Space>
                ),
                children: (
                  <DataTable
                    queryScript={queryScript}
                    rowKey="changeRequestId"
                    size="small"
                    dataSource={group.requests}
                    searchQuery={search}
                    onSearch={(next) => {
                      openList({ page: 1, q: next || null });
                    }}
                    pagination={false}
                    rowClassName={(row) =>
                      row.changeRequestId === changeRequestView.selectedId
                        ? "ant-table-row-selected"
                        : ""
                    }
                    onRow={(row) => ({
                      onClick: () => {
                        void changeRequestView.openView(row.changeRequestId);
                      },
                    })}
                    columns={[
                      {
                        title: "Id",
                        dataIndex: "changeRequestId",
                        width: 90,
                        render: (changeRequestId: number) => (
                          <ChangeRequestIdButton
                            changeRequestId={changeRequestId}
                            onOpen={(id) => {
                              void changeRequestView.openView(id);
                            }}
                          />
                        ),
                      },
                      {
                        title: "Sections",
                        render: (_: unknown, row: ChangeRequestListItem) => (
                          <SectionChips
                            employerId={employerId}
                            names={splitNames(row.sectionNames)}
                          />
                        ),
                      },
                      {
                        title: "Requested by",
                        render: (_: unknown, row: ChangeRequestListItem) =>
                          row.createdByName
                            ? `${row.createdByName}${
                                row.createdByEmploymentNumber
                                  ? ` · ${row.createdByEmploymentNumber}`
                                  : ""
                              }`
                            : "—",
                      },
                      {
                        title: "Approver",
                        render: (_: unknown, row: ChangeRequestListItem) => (
                          <ChangeRequestApprovers
                            employerId={employerId}
                            approvers={row.approvers}
                          />
                        ),
                      },
                      {
                        title: "Requested",
                        dataIndex: "requestedDate",
                        width: 180,
                        render: (value: string | null) => formatDate(value),
                      },
                      {
                        title: "Status",
                        dataIndex: "status",
                        width: 110,
                        render: (status: ChangeRequestListItem["status"]) => (
                          <Tag color={STATUS_COLOR[status]}>{status}</Tag>
                        ),
                      },
                      {
                        title: "Actions",
                        key: "decideActions",
                        width: 180,
                        render: (_: unknown, row: ChangeRequestListItem) => {
                          const actions = changeRequestDecideActions(
                            row.status,
                          );
                          if (actions.length === 0) {
                            return null;
                          }
                          return (
                            <Space>
                              {actions.map((status) => (
                                <Button
                                  key={status}
                                  danger={status === "Rejected"}
                                  disabled={!writesEnabled}
                                  loading={
                                    decideLoading?.changeRequestId ===
                                      row.changeRequestId &&
                                    decideLoading.status === status
                                  }
                                  size="small"
                                  title={
                                    writesEnabled
                                      ? undefined
                                      : "Writes are disabled for this environment."
                                  }
                                  type={
                                    status === "Approved"
                                      ? "primary"
                                      : "default"
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void openDecide(
                                      row.changeRequestId,
                                      status,
                                    );
                                  }}
                                >
                                  {status === "Approved" ? "Approve" : "Reject"}
                                </Button>
                              ))}
                            </Space>
                          );
                        },
                      },
                    ]}
                  />
                ),
              };
            })}
          />
        )}
        <Pagination
          current={page}
          pageSize={pageSize}
          showSizeChanger={false}
          total={total}
          onChange={(next) => {
            openList({ page: next });
          }}
        />
      </Space>
      {changeRequestView.modal}
      <ChangeRequestDecideModal
        approvers={decideApprovers}
        detail={decideDetail}
        employerId={employerId}
        open={decideStatus != null && decideDetail != null}
        queryScript={decideScript}
        status={decideStatus ?? "Approved"}
        writesEnabled={writesEnabled}
        onClose={() => {
          setDecideStatus(null);
        }}
        onDone={() => {
          setDecideStatus(null);
          setDecideDetail(null);
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
