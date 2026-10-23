"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import type { TeamIteration } from "@hrms/azure-devops";
import { formatDate } from "@/shared/format-date";

const TIME_FRAME_COLORS: Record<string, string> = {
  current: "processing",
  future: "success",
  past: "warning",
};

function boardHref(iterationPath: string, teamName: string): string {
  const params = new URLSearchParams();
  if (teamName.length > 0) {
    params.set("team", teamName);
  }
  params.set("iteration", iterationPath);
  return `/azure/board?${params.toString()}`;
}

function sprintHref(
  iterationPath: string,
  filterQuery?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (filterQuery) {
    for (const [key, value] of Object.entries(filterQuery)) {
      if (value != null && value.length > 0) {
        params.set(key, value);
      }
    }
  }
  params.set("iteration", iterationPath);
  const query = params.toString();
  return query ? `/azure/sprints?${query}` : `/azure/sprints?iteration=${encodeURIComponent(iterationPath)}`;
}

export function IterationList({
  iterations,
  selectedIterationPath,
  filterQuery,
  teamName,
}: {
  iterations: TeamIteration[];
  selectedIterationPath?: string;
  filterQuery?: Record<string, string | undefined>;
  teamName: string;
}): React.JSX.Element {
  const columns: ColumnsType<TeamIteration> = [
    {
      title: "Sprint",
      dataIndex: "name",
      render: (name: string, row) => (
        <span className="inline-flex items-center gap-3">
          <Link href={sprintHref(row.path, filterQuery)}>{name}</Link>
          {row.path === selectedIterationPath ? (
            <Link
              className="text-sm font-normal text-slate-500 hover:text-slate-900 dark:hover:text-white"
              href={boardHref(row.path, teamName)}
            >
              Open board
            </Link>
          ) : null}
        </span>
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
      size="middle"
      scroll={{ x: true }}
      rowClassName={(row) =>
        row.path === selectedIterationPath ? "bg-blue-50 dark:bg-blue-950" : ""
      }
      locale={{ emptyText: "No sprints found for this team and filter set." }}
    />
  );
}
