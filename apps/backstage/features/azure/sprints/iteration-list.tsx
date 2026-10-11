"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import type { TeamIteration } from "@hrms/azure-devops";
import { formatDate } from "@/shared/format-date";

const TIME_FRAME_COLORS: Record<string, string> = {
  current: "blue",
  future: "default",
  past: "default",
};

export function IterationList({
  iterations,
  selectedIterationPath,
}: {
  iterations: TeamIteration[];
  selectedIterationPath?: string;
}): React.JSX.Element {
  const columns: ColumnsType<TeamIteration> = [
    {
      title: "Sprint",
      dataIndex: "name",
      render: (name: string, row) => (
        <Link href={`/azure/sprints?iteration=${encodeURIComponent(row.path)}`}>
          {name}
        </Link>
      ),
    },
    {
      title: "Time frame",
      dataIndex: "timeFrame",
      width: 120,
      render: (timeFrame: TeamIteration["timeFrame"]) =>
        timeFrame ? (
          <Tag color={TIME_FRAME_COLORS[timeFrame] ?? "default"}>{timeFrame}</Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Start",
      dataIndex: "startDate",
      width: 140,
      render: (value: string | null) => formatDate(value),
    },
    {
      title: "Finish",
      dataIndex: "finishDate",
      width: 140,
      render: (value: string | null) => formatDate(value),
    },
  ];

  return (
    <Table<TeamIteration>
      rowKey="id"
      dataSource={iterations}
      columns={columns}
      pagination={false}
      rowClassName={(row) =>
        row.path === selectedIterationPath ? "bg-blue-50 dark:bg-blue-950" : ""
      }
      locale={{ emptyText: "No sprints found for the configured team." }}
    />
  );
}
