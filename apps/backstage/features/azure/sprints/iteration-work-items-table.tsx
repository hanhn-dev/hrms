"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { WorkItemSummary } from "@hrms/azure-devops";
import { formatDate } from "@/shared/format-date";

export function IterationWorkItemsTable({
  workItems,
}: {
  workItems: WorkItemSummary[];
}): React.JSX.Element {
  const columns: ColumnsType<WorkItemSummary> = [
    {
      title: "Id",
      dataIndex: "id",
      width: 90,
      render: (id: number, row) => (
        <a href={row.url} rel="noopener noreferrer" target="_blank">
          {id}
        </a>
      ),
    },
    { title: "Title", dataIndex: "title", ellipsis: true },
    {
      title: "Type",
      dataIndex: "type",
      width: 130,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    { title: "State", dataIndex: "state", width: 130 },
    {
      title: "Assigned to",
      dataIndex: "assignedTo",
      width: 180,
      render: (value: string | null) => value ?? "Unassigned",
    },
    {
      title: "Changed",
      dataIndex: "changedDate",
      width: 140,
      render: (value: string | null) => formatDate(value),
    },
  ];

  return (
    <Table<WorkItemSummary>
      rowKey="id"
      dataSource={workItems}
      columns={columns}
      pagination={{ pageSize: 20, showSizeChanger: true }}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "No work items in this sprint." }}
    />
  );
}
