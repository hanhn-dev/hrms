"use client";

import { useMemo, useState } from "react";
import { Collapse, Empty, Input, Segmented, Space, Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import { changeRequestApproverSearchValues } from "@/features/employer/workflows/change-request-approver-label";
import {
  ChangeRequestApprovers,
  splitNames,
} from "@/features/employer/workflows/change-request-labels";
import {
  ChangeRequestIdButton,
  useChangeRequestView,
} from "@/features/employer/workflows/change-request-view";
import type { ChangeRequestListItem } from "@/features/employee/change-requests/queries";
import {
  expandedWorkflowGroupKeys,
  groupChangeRequestsByWorkflow,
} from "@/features/employee/change-requests/group";
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
  requests,
  queryScript,
}: {
  employerId: number;
  requests: ChangeRequestListItem[];
  queryScript: string;
}): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [openOverride, setOpenOverride] = useState<{
    signature: string;
    keys: string[];
  } | null>(null);
  const changeRequestView = useChangeRequestView(employerId);

  const counts = useMemo(() => {
    const tally = { all: requests.length, pending: 0, approved: 0, rejected: 0 };
    for (const row of requests) {
      tally[row.status] += 1;
    }
    return tally;
  }, [requests]);

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
        row.sectionNames,
        row.workflowName,
        row.createdByName,
        row.createdByEmploymentNumber,
        ...changeRequestApproverSearchValues(row.approvers),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [requests, search, statusFilter]);

  const groups = useMemo(() => groupChangeRequestsByWorkflow(visible), [visible]);
  const groupSignature = `${statusFilter}|${search.trim().toLowerCase()}|${groups
    .map((group) => group.key)
    .join(",")}`;
  const activeKeys =
    openOverride?.signature === groupSignature
      ? openOverride.keys
      : expandedWorkflowGroupKeys(groups);

  if (requests.length === 0) {
    return <Empty description="This employee has no change requests." />;
  }

  return (
    <>
      <Space className="w-full" orientation="vertical" size="middle">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            options={STATUS_FILTERS.map((value) => ({
              label: `${value[0]?.toUpperCase()}${value.slice(1)} (${counts[value]})`,
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
            placeholder="Search id, section, workflow, requester, or approver"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        {groups.length === 0 ? (
          <Empty description="No change requests match this filter." />
        ) : (
          <Collapse
            activeKey={activeKeys}
            onChange={(keys) => {
              const next = Array.isArray(keys) ? keys.map(String) : [String(keys)];
              setOpenOverride({ signature: groupSignature, keys: next });
            }}
            items={groups.map((group) => ({
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
                  <Tag>{group.requests.length}</Tag>
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
                  ]}
                />
              ),
            }))}
          />
        )}
      </Space>
      {changeRequestView.modal}
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
